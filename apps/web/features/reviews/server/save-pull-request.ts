import type { PullRequestWebhookPayload } from "@/features/reviews/types/review";
import { resolveFeatureLink } from "@/features/reviews/server/resolve-feature-link";
import { onPullRequestSynchronized } from "@/features/shipflow/server/feature-workflow";
import { prisma } from "@/lib/db";

export async function savePullRequest(payload: PullRequestWebhookPayload) {
  const installationId = payload.installation?.id;
  if (!installationId) {
    throw new Error("Webhook payload is missing installation.id");
  }

  const { repository, pull_request: pullRequest } = payload;

  const existing = await prisma.pullRequest.findUnique({
    where: {
      repoFullName_prNumber: {
        repoFullName: repository.full_name,
        prNumber: pullRequest.number,
      },
    },
    select: { headSha: true, featureRequestId: true },
  });

  const link = await resolveFeatureLink({
    repoFullName: repository.full_name,
    branch: pullRequest.head.ref,
    title: pullRequest.title,
    body: pullRequest.body,
  });

  const featureRequestId =
    link.featureRequestId ?? existing?.featureRequestId ?? null;

  const linkData = {
    featureRequestId,
    projectId: link.projectId,
    repositoryId: link.repositoryId,
  };

  const linkPatch = {
    ...(link.featureRequestId ? { featureRequestId: link.featureRequestId } : {}),
    ...(link.projectId ? { projectId: link.projectId } : {}),
    ...(link.repositoryId ? { repositoryId: link.repositoryId } : {}),
  };

  const saved = await prisma.pullRequest.upsert({
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
      ...linkData,
    },
    update: {
      installationId,
      title: pullRequest.title,
      authorLogin: pullRequest.user?.login ?? "unknown",
      headSha: pullRequest.head.sha,
      baseBranch: pullRequest.base.ref,
      status: "pending",
      ...linkPatch,
    },
  });

  if (payload.action === "synchronize") {
    await onPullRequestSynchronized({
      featureRequestId,
      previousHeadSha: existing?.headSha,
      newHeadSha: pullRequest.head.sha,
    });
  }

  return saved;
}
