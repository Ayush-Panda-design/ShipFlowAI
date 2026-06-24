import type { PullRequestWebhookPayload } from "@/features/reviews/types/review";
import { prisma } from "@/lib/db";

export async function savePullRequest(payload: PullRequestWebhookPayload) {
  const installationId = payload.installation?.id;
  if (!installationId) {
    throw new Error("Webhook payload is missing installation.id");
  }

  const { repository, pull_request: pullRequest } = payload;

  return prisma.pullRequest.upsert({
    where: {
      repoFullName_prNumber: {
        repoFullName: repository.full_name,
        prNumber: pullRequest.number,
      },
    },
    create: {
      installationId,
      repoFullName: repository.full_name,
      prNumber: pullRequest.number,
      title: pullRequest.title,
      authorLogin: pullRequest.user?.login ?? "unknown",
      headSha: pullRequest.head.sha,
      baseBranch: pullRequest.base.ref,
      status: "pending",
    },
    update: {
      installationId,
      title: pullRequest.title,
      authorLogin: pullRequest.user?.login ?? "unknown",
      headSha: pullRequest.head.sha,
      baseBranch: pullRequest.base.ref,
      status: "pending",
    },
  });
}
