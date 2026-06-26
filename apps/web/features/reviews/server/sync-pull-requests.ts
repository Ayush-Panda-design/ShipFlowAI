import { getGitHubApp } from "@/features/github/utils/github-app";
import { queueReviewForPullRequest } from "@/features/reviews/server/trigger-review";
import { isReviewPipelineConfigured } from "@/features/reviews/server/review-config";
import { resolveFeatureLink } from "@/features/reviews/server/resolve-feature-link";
import { prisma } from "@/lib/db";

export async function syncPullRequestsForInstallation(installationId: number) {
  const app = getGitHubApp();
  const octokit = await app.getInstallationOctokit(installationId);

  const repositories = await octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 }
  );

  let synced = 0;
  let queued = 0;
  const canQueueReviews = isReviewPipelineConfigured();

  for (const repository of repositories) {
    const [owner, repo] = repository.full_name.split("/");
    if (!owner || !repo) {
      continue;
    }

    const { data: pullRequests } = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
    });

    for (const pullRequest of pullRequests) {
      const existing = await prisma.pullRequest.findUnique({
        where: {
          repoFullName_prNumber: {
            repoFullName: repository.full_name,
            prNumber: pullRequest.number,
          },
        },
        select: { status: true },
      });

      const shouldQueueReview =
        canQueueReviews &&
        (!existing || existing.status === "pending" || existing.status === "failed");

      const link = await resolveFeatureLink({
        repoFullName: repository.full_name,
        branch: pullRequest.head.ref,
        title: pullRequest.title,
        body: pullRequest.body,
      });

      const linkData = {
        featureRequestId: link.featureRequestId,
        projectId: link.projectId,
        repositoryId: link.repositoryId,
      };

      const linkPatch = {
        ...(link.featureRequestId ? { featureRequestId: link.featureRequestId } : {}),
        ...(link.projectId ? { projectId: link.projectId } : {}),
        ...(link.repositoryId ? { repositoryId: link.repositoryId } : {}),
      };

      await prisma.pullRequest.upsert({
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
          ...linkPatch,
        },
      });

      synced += 1;

      if (shouldQueueReview) {
        await queueReviewForPullRequest({
          installationId,
          repoFullName: repository.full_name,
          prNumber: pullRequest.number,
          title: pullRequest.title,
          authorLogin: pullRequest.user?.login ?? "unknown",
          headSha: pullRequest.head.sha,
          baseBranch: pullRequest.base.ref,
          action: "synchronize",
        });
        queued += 1;
      }
    }
  }

  return { synced, queued };
}
