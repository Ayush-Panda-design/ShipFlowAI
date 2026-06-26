import {
  AI_CREDIT_COSTS,
  resolveWorkspaceIdForFeature,
  tryConsumeCredits,
} from "@repo/services";

export async function consumeFeatureCreditsForJob(
  featureRequestId: string,
  cost: number,
) {
  const workspaceId = await resolveWorkspaceIdForFeature(featureRequestId);
  return tryConsumeCredits(workspaceId, cost);
}

export { AI_CREDIT_COSTS };
