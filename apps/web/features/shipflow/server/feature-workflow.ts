import type { FeatureStatus } from "@repo/services";
import { prisma } from "@/lib/db";

const TERMINAL_STATUSES = new Set<FeatureStatus>([
  "shipped",
  "rejected",
  "duplicate",
]);

/** Developer pushed new commits — start the fix → re-review loop. */
export async function onPullRequestSynchronized(input: {
  featureRequestId: string | null;
  previousHeadSha?: string;
  newHeadSha: string;
}) {
  if (!input.featureRequestId) {
    return;
  }

  if (
    input.previousHeadSha &&
    input.previousHeadSha === input.newHeadSha
  ) {
    return;
  }

  const feature = await prisma.featureRequest.findUnique({
    where: { id: input.featureRequestId },
    select: { status: true },
  });

  if (!feature || TERMINAL_STATUSES.has(feature.status as FeatureStatus)) {
    return;
  }

  const reReviewStatuses = new Set<FeatureStatus>([
    "fix_needed",
    "in_review",
    "awaiting_approval",
  ]);

  if (!reReviewStatuses.has(feature.status as FeatureStatus)) {
    return;
  }

  await prisma.featureRequest.update({
    where: { id: input.featureRequestId },
    data: { status: "in_development" },
  });
}

export async function requestManualReReview(featureRequestId: string) {
  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    include: {
      pullRequests: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!feature) {
    throw new Error("Feature request not found");
  }

  if (feature.status !== "fix_needed") {
    throw new Error("Re-review is only available when status is fix needed");
  }

  const pullRequest = feature.pullRequests[0];
  if (!pullRequest) {
    throw new Error("Link a pull request before requesting re-review");
  }

  await prisma.$transaction([
    prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: { status: "in_development" },
    }),
    prisma.pullRequest.update({
      where: { id: pullRequest.id },
      data: { status: "pending" },
    }),
  ]);

  return pullRequest;
}

export function describeWorkflowStatus(status: string) {
  switch (status) {
    case "fix_needed":
      return "Blocking issues found. Developer should fix and push — the next PR sync auto-triggers re-review.";
    case "in_development":
      return "Fixes in progress. Push commits or run re-review when ready.";
    case "in_review":
      return "AI review running against PRD and acceptance criteria.";
    case "awaiting_approval":
      return "No blocking issues. A human can approve or reject release.";
    default:
      return null;
  }
}
