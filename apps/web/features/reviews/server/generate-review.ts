import { generateObject, jsonSchema } from "ai";

import { getReviewModel, getReviewMaxOutputTokens } from "@/features/ai-sdk";
import type { RetrievedChunk } from "@/features/reviews/server/vectors";
import type {
  ReviewContext,
  StructuredReview,
} from "@/features/reviews/types/structured-review";
import { countFindings } from "@/features/reviews/types/structured-review";

const GENERIC_REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer. Review pull request changes for correctness, security, performance, and maintainability.

Classify every issue as:
- blocking: must be fixed before merge (bugs, security holes, missing critical requirements)
- non_blocking: improvements, style, minor gaps

Be specific and reference file paths when possible.`;

const PRD_AWARE_REVIEW_SYSTEM_PROMPT = `You are ShipFlow AI's PRD-aware code reviewer.

Your job is to verify that the pull request implements the linked feature's PRD, acceptance criteria, and engineering tasks.

Classify every issue as:
- blocking: violates acceptance criteria, misses required behavior, security/data bugs, or breaks core PRD goals
- non_blocking: polish, refactors, minor deviations, or suggestions

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
        `_Additional diff context omitted to stay within model limits._`
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
        }`
    )
    .join("\n");
}

function normalizeReview(review: StructuredReview): StructuredReview {
  const findings = review.findings.map((finding, index) => ({
    ...finding,
    id: finding.id || `finding-${index + 1}`,
    severity:
      finding.severity === "blocking" ? "blocking" : ("non_blocking" as const),
  }));

  return {
    summary: review.summary.trim(),
    prdAlignment: review.prdAlignment.trim(),
    findings,
  };
}

export async function generateReview(
  title: string,
  contextChunks: RetrievedChunk[],
  reviewContext: ReviewContext
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

Return structured findings. Use blocking only for issues that must be fixed before merge.`
    : `Review this pull request.

**Title:** ${title}

**Relevant diff context (semantic search):**
${diffContext}

Return structured findings. Use blocking only for correctness, security, or critical quality issues.`;

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
  return { review, ...counts };
}
