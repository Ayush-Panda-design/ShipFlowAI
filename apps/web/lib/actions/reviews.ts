"use server";

import { revalidatePath } from "next/cache";

import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { getInstallationForUser } from "@/features/github/server/installation";
import {
  getReviewPipelineConfigErrors,
  isReviewPipelineConfigured,
} from "@/features/reviews/server/review-config";
import { syncPullRequestsForInstallation } from "@/features/reviews/server/sync-pull-requests";
import { queueReviewForPullRequest } from "@/features/reviews/server/trigger-review";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

const STALE_PROCESSING_MS = 5 * 60 * 1000;

export type ReviewActionResult = {
  ok: boolean;
  message: string;
};

export async function syncPullRequests() {
  const session = await requireSession();
  const installation = await getInstallationForUser(session.user.id);

  if (!installation) {
    throw new Error("GitHub App is not connected.");
  }

  await syncPullRequestsForInstallation(installation.installationId);
  revalidatePath(`${DASHBOARD_BASE_PATH}/pull-requests`);
}

export async function runPullRequestReview(
  pullRequestId: string
): Promise<ReviewActionResult> {
  const session = await requireSession();
  const installation = await getInstallationForUser(session.user.id);

  if (!installation) {
    return { ok: false, message: "GitHub App is not connected." };
  }

  const configErrors = getReviewPipelineConfigErrors();
  if (configErrors.length > 0) {
    return { ok: false, message: configErrors.join(" ") };
  }

  const pullRequest = await prisma.pullRequest.findFirst({
    where: {
      id: pullRequestId,
      installationId: installation.installationId,
    },
  });

  if (!pullRequest) {
    return { ok: false, message: "Pull request not found." };
  }

  if (pullRequest.status === "processing") {
    const elapsedMs = Date.now() - pullRequest.updatedAt.getTime();
    if (elapsedMs < STALE_PROCESSING_MS) {
      return {
        ok: false,
        message:
          "Review already in progress. Wait a minute, then refresh the page.",
      };
    }
  }

  await prisma.pullRequest.update({
    where: { id: pullRequest.id },
    data: { status: "pending" },
  });

  await queueReviewForPullRequest({
    installationId: pullRequest.installationId,
    repoFullName: pullRequest.repoFullName,
    prNumber: pullRequest.prNumber,
    title: pullRequest.title,
    authorLogin: pullRequest.authorLogin,
    headSha: pullRequest.headSha,
    baseBranch: pullRequest.baseBranch,
    action: "synchronize",
  });

  revalidatePath(`${DASHBOARD_BASE_PATH}/pull-requests`);
  revalidatePath(`${DASHBOARD_BASE_PATH}/feature-requests`);

  return {
    ok: true,
    message: "Review queued. Status will update in ~30–60 seconds.",
  };
}

export async function getReviewPipelineStatus() {
  return {
    configured: isReviewPipelineConfigured(),
    errors: getReviewPipelineConfigErrors(),
  };
}
