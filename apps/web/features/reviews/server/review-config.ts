import { getOpenRouterConfigError } from "@/features/ai-sdk";
import { getPineconeConfigError } from "@/features/pinecone/client";

export function getReviewPipelineConfigErrors(): string[] {
  const errors: string[] = [];

  const openRouterError = getOpenRouterConfigError();
  if (openRouterError) {
    errors.push(openRouterError);
  }

  return errors;
}

/** Optional services — reviews still work without these. */
export function getReviewPipelineWarnings(): string[] {
  const warnings: string[] = [];

  const pineconeError = getPineconeConfigError();
  if (pineconeError) {
    warnings.push(
      `${pineconeError} Reviews use local file matching instead of Pinecone.`,
    );
  }

  return warnings;
}

export function isReviewPipelineConfigured() {
  return getReviewPipelineConfigErrors().length === 0;
}
