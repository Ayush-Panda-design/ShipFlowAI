import { generateObject, generateText, jsonSchema } from "ai";

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

const CODE_SUGGESTION_INSTRUCTIONS = `For EACH finding, when you can propose a concrete fix:
- Set "codeSuggestion" to the corrected code ONLY (the replacement snippet a developer can paste in). No prose, no explanation, no diff markers like + or -.
- Set "filePath" to the file the fix belongs in.
- Set "lineStart" (and "lineEnd" if it spans multiple lines) to the 1-based line numbers of the original code being replaced, when you can infer them from the diff.
Keep the suggestion minimal — only the lines that change. Omit "codeSuggestion" only when no concrete code fix is possible (e.g. purely architectural advice).`;

const GENERIC_REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer. Review pull request changes for correctness, security, performance, and maintainability.

Classify every issue as:
- blocking: must be fixed before merge (bugs, security holes, missing critical requirements)
- non_blocking: improvements, style, minor gaps

CRITICAL: Use blocking ONLY for real defects or security issues.

Put a brief explanation (1-2 sentences) in the description field.
${CODE_SUGGESTION_INSTRUCTIONS}

Set confidenceScore (0-100) for the overall PR and confidence (0-100) on EACH finding.
Include filePath when citing code. Limit to at most 8 findings — prioritize blocking issues.`;

const PRD_AWARE_REVIEW_SYSTEM_PROMPT = `You are ShipFlow AI's PRD-aware code reviewer.

Verify the pull request against the linked PRD, acceptance criteria, and engineering tasks.

Classify issues as blocking or non_blocking. Use blocking ONLY when the PR must not ship without a fix.

Put a brief explanation in description (plain text).
${CODE_SUGGESTION_INSTRUCTIONS}

Set confidenceScore and per-finding confidence (0-100).
Include filePath when citing code. Max 8 findings. Always assess PRD alignment in prdAlignment.`;

const MAX_FINDINGS = 8;

const reviewOutputSchema = jsonSchema<StructuredReview>({
  type: "object",
  properties: {
    summary: { type: "string" },
    prdAlignment: { type: "string" },
    confidenceScore: { type: "number" },
    findings: {
      type: "array",
      maxItems: MAX_FINDINGS,
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          severity: { type: "string", enum: ["blocking", "non_blocking"] },
          category: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          filePath: { type: "string" },
          lineStart: { type: "number" },
          lineEnd: { type: "number" },
          codeSuggestion: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["id", "severity", "category", "title", "description"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "prdAlignment", "findings"],
  additionalProperties: false,
});

const MAX_CHUNK_CHARS = 2_000;
const MAX_TOTAL_CONTEXT_CHARS = 12_000;
const MAX_PRD_CHARS = 4_000;
const MAX_TASKS = 12;

function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}...`;
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
      sections.push("_Additional diff context omitted._");
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
    `Acceptance criteria: ${context.prd.acceptanceCriteria}`,
  ];

  return truncateText(sections.join("\n\n"), MAX_PRD_CHARS);
}

function formatTaskContext(context: ReviewContext) {
  if (context.tasks.length === 0) {
    return "No engineering tasks are defined for this feature.";
  }

  return context.tasks
    .slice(0, MAX_TASKS)
    .map((task, index) => `${index + 1}. [${task.status}] ${task.title}`)
    .join("\n");
}

function normalizeReview(review: StructuredReview): StructuredReview {
  const findings: StructuredReview["findings"] = review.findings
    .slice(0, MAX_FINDINGS)
    .map((finding, index) => ({
      ...finding,
      id: finding.id || `finding-${index + 1}`,
      severity:
        finding.severity === "blocking"
          ? ("blocking" as const)
          : ("non_blocking" as const),
      title: truncateText(finding.title, 200),
      description: truncateText(finding.description, 500),
      filePath: finding.filePath?.slice(0, 300),
      lineStart:
        typeof finding.lineStart === "number" && Number.isFinite(finding.lineStart)
          ? Math.max(1, Math.round(finding.lineStart))
          : undefined,
      lineEnd:
        typeof finding.lineEnd === "number" && Number.isFinite(finding.lineEnd)
          ? Math.max(1, Math.round(finding.lineEnd))
          : undefined,
      codeSuggestion: finding.codeSuggestion
        ? truncateText(finding.codeSuggestion.trim(), 1200)
        : undefined,
      confidence:
        typeof finding.confidence === "number" && Number.isFinite(finding.confidence)
          ? Math.max(0, Math.min(100, Math.round(finding.confidence)))
          : undefined,
    }));

  return {
    summary: truncateText(review.summary.trim(), 1500),
    prdAlignment: truncateText(review.prdAlignment.trim(), 1000),
    findings,
    confidenceScore: review.confidenceScore,
  };
}

async function generateReviewObject(
  model: ReturnType<typeof getReviewModel>,
  system: string,
  prompt: string,
) {
  const { object } = await generateObject({
    model,
    maxOutputTokens: getReviewMaxOutputTokens(),
    schema: reviewOutputSchema,
    system,
    prompt,
  });

  return normalizeReview(object);
}

async function generateReviewTextFallback(
  model: ReturnType<typeof getReviewModel>,
  system: string,
  prompt: string,
  isPrdAware: boolean,
) {
  const { text } = await generateText({
    model,
    maxOutputTokens: getReviewMaxOutputTokens(),
    system: `${system}\n\nRespond with a concise review summary only.`,
    prompt,
  });

  return normalizeReview({
    summary: text.trim() || "Review completed with summary-only fallback.",
    prdAlignment: isPrdAware
      ? "Automated fallback review — re-run for structured PRD alignment."
      : "No PRD linked.",
    findings: [],
    confidenceScore: 70,
  });
}

export async function generateReview(
  title: string,
  contextChunks: RetrievedChunk[],
  reviewContext: ReviewContext,
  options?: {
    suppressedPatterns?: string[];
    mutedCategories?: string[];
  },
) {
  const model = getReviewModel();
  const diffContext = formatContext(contextChunks);
  const isPrdAware = Boolean(reviewContext.featureRequestId && reviewContext.prd);

  const suppressionNote =
    options?.suppressedPatterns?.length || options?.mutedCategories?.length
      ? `\n\nSkip findings matching: ${[
          ...(options.mutedCategories ?? []),
          ...(options.suppressedPatterns ?? []),
        ].join(", ")}`
      : "";

  const prompt = isPrdAware
    ? `Review PR "${title}" against PRD and tasks.\n\nPRD:\n${formatPrdContext(reviewContext)}\n\nTasks:\n${formatTaskContext(reviewContext)}\n\nDiff:\n${diffContext}${suppressionNote}`
    : `Review PR "${title}".\n\nDiff:\n${diffContext}${suppressionNote}`;

  const system = isPrdAware
    ? PRD_AWARE_REVIEW_SYSTEM_PROMPT
    : GENERIC_REVIEW_SYSTEM_PROMPT;

  try {
    return await generateReviewObject(model, system, prompt);
  } catch (firstError) {
    console.warn("[generate-review] primary structured output failed:", firstError);

    try {
      return await generateReviewObject(
        model,
        `${system}\n\nSTRICT: Valid JSON only. Max 5 findings. Every string under 150 characters.`,
        prompt,
      );
    } catch (secondError) {
      console.warn("[generate-review] retry failed, using text fallback:", secondError);
      return generateReviewTextFallback(model, system, prompt, isPrdAware);
    }
  }
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
