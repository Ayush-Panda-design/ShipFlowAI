import { generateObject, jsonSchema } from "ai";

import { getReviewModel, getReviewMaxOutputTokens } from "@/features/ai-sdk";
import type { RetrievedChunk } from "@/features/reviews/server/vectors";
import type {
  ReviewContext,
  StructuredReview,
} from "@/features/reviews/types/structured-review";
import {
  computeConfidenceScore,
  countFindings,
} from "@/features/reviews/types/structured-review";

const ACTIONABLE_RULES = `For every finding that implies a code change, include codeSuggestion: a specific, copy-pasteable fix (snippet, function body, or diff-style replacement). Never say only "consider refactoring" — show exactly what to change.

- blocking: codeSuggestion is REQUIRED on every finding.
- non_blocking: codeSuggestion is REQUIRED whenever a concrete improvement can be shown; omit only for purely informational notes with no applicable code change.`;

const GENERIC_REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer. Review pull request changes for correctness, security, performance, and maintainability.

Classify every issue as:
- blocking: must be fixed before merge (bugs, security holes, missing critical requirements)
- non_blocking: improvements, style, minor gaps

CRITICAL: Use blocking ONLY for real defects or security issues. Do NOT mark correct security improvements, intended behavior, or positive changes as blocking.

${ACTIONABLE_RULES}

Also set confidenceScore (0-100): how close this PR is to passing review (100 = ship-ready, 0 = major rework needed).

Be specific and reference file paths when possible.`;

const PRD_AWARE_REVIEW_SYSTEM_PROMPT = `You are ShipFlow AI's PRD-aware code reviewer.

Your job is to verify that the pull request implements the linked feature's PRD, acceptance criteria, and engineering tasks.

Classify every issue as:
- blocking: violates acceptance criteria, misses required behavior, security/data bugs, or breaks core PRD goals
- non_blocking: polish, refactors, minor deviations, or suggestions

CRITICAL: Use blocking ONLY when the PR must not ship without a fix. Correct implementations, defense-in-depth checks, and acceptable trade-offs are NOT blocking.

${ACTIONABLE_RULES}

Set confidenceScore (0-100) from PRD alignment + severity of remaining issues.

Always assess PRD alignment explicitly in prdAlignment.`;

const MAX_CHUNK_CHARS = 2_000;
const MAX_TOTAL_CONTEXT_CHARS = 12_000;
const MAX_PRD_CHARS = 4_000;
const MAX_TASKS = 12;

const reviewOutputSchema = jsonSchema<StructuredReview>({
  type: "object",
  properties: {
    summary: { type: "string" },
    prdAlignment: { type: "string" },
    confidenceScore: { type: "number" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          severity: { type: "string", enum: ["blocking", "non_blocking"] },
          category: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          filePath: { type: "string" },
          codeSuggestion: { type: "string" },
        },
        required: ["id", "severity", "category", "title", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "prdAlignment", "findings"],
  additionalProperties: false,
});

function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, maxChars)}\n... [truncated]`;
}

function formatContext(chunks: RetrievedChunk[]) {
  if (chunks.length === 0) {
    return "No diff context available.";
  }

  const sections: string[] = [];
  let totalChars = 0;

  for (const [index, chunk] of chunks.entries()) {
    const body = truncateText(chunk.text, MAX_CHUNK_CHARS);
    const section = `### Context ${index + 1}: ${chunk.filePath}\n\`\`\`diff\n${body}\n\`\`\``;

    if (totalChars + section.length > MAX_TOTAL_CONTEXT_CHARS) {
      sections.push(
        `_Additional diff context omitted to stay within model limits._`,
      );
      break;
    }

    sections.push(section);
    totalChars += section.length;
  }

  return sections.join("\n\n");
}

function formatPrdContext(context: ReviewContext) {
  if (!context.prd) {
    return "No PRD is linked to this pull request.";
  }

  const sections = [
    `Feature: ${context.featureTitle ?? "Unknown"}`,
    `Problem: ${context.prd.problemStatement}`,
    `Goals: ${context.prd.goals}`,
    `Non-goals: ${context.prd.nonGoals}`,
    `User stories: ${context.prd.userStories}`,
    `Acceptance criteria: ${context.prd.acceptanceCriteria}`,
    `Edge cases: ${context.prd.edgeCases}`,
  ];

  return truncateText(sections.join("\n\n"), MAX_PRD_CHARS);
}

function formatTaskContext(context: ReviewContext) {
  if (context.tasks.length === 0) {
    return "No engineering tasks are defined for this feature.";
  }

  return context.tasks
    .slice(0, MAX_TASKS)
    .map(
      (task, index) =>
        `${index + 1}. [${task.status}] ${task.title}${
          task.description ? ` — ${task.description}` : ""
        }`,
    )
    .join("\n");
}

function normalizeReview(review: StructuredReview): StructuredReview {
  const findings: StructuredReview["findings"] = review.findings.map(
    (finding, index) => ({
      ...finding,
      id: finding.id || `finding-${index + 1}`,
      severity:
        finding.severity === "blocking"
          ? ("blocking" as const)
          : ("non_blocking" as const),
      codeSuggestion: finding.codeSuggestion?.trim() || undefined,
    }),
  );

  return {
    summary: review.summary.trim(),
    prdAlignment: review.prdAlignment.trim(),
    findings,
    confidenceScore: review.confidenceScore,
  };
}

export async function generateReview(
  title: string,
  contextChunks: RetrievedChunk[],
  reviewContext: ReviewContext,
) {
  const model = getReviewModel();
  const diffContext = formatContext(contextChunks);
  const isPrdAware = Boolean(reviewContext.featureRequestId && reviewContext.prd);

  const prompt = isPrdAware
    ? `Review this pull request against the linked feature's PRD and engineering tasks.

**Pull request title:** ${title}

**PRD context:**
${formatPrdContext(reviewContext)}

**Engineering tasks:**
${formatTaskContext(reviewContext)}

**Relevant diff context (semantic search):**
${diffContext}

Return structured findings. Include codeSuggestion on every blocking issue and on non_blocking issues whenever a concrete code fix applies. Set confidenceScore 0-100.`
    : `Review this pull request.

**Title:** ${title}

**Relevant diff context (semantic search):**
${diffContext}

Return structured findings. Include codeSuggestion on every blocking issue and on non_blocking issues whenever a concrete code fix applies. Set confidenceScore 0-100.`;

  const { object } = await generateObject({
    model,
    maxOutputTokens: getReviewMaxOutputTokens(),
    schema: reviewOutputSchema,
    system: isPrdAware
      ? PRD_AWARE_REVIEW_SYSTEM_PROMPT
      : GENERIC_REVIEW_SYSTEM_PROMPT,
    prompt,
  });

  return normalizeReview(object);
}

export function enrichReview(review: StructuredReview) {
  const counts = countFindings(review.findings);
  const confidenceScore =
    typeof review.confidenceScore === "number" &&
    Number.isFinite(review.confidenceScore)
      ? Math.max(0, Math.min(100, Math.round(review.confidenceScore)))
      : computeConfidenceScore(review, counts);

  return {
    review: { ...review, confidenceScore },
    ...counts,
    confidenceScore,
  };
}
