import type { Octokit } from "octokit";
import pLimit from "p-limit";

import { getGitHubApp } from "@/features/github/utils/github-app";
import { isReviewPipelineConfigured } from "@/features/reviews/server/review-config";
import { resolveFeatureLink } from "@/features/reviews/server/resolve-feature-link";
import { queueReviewForPullRequest } from "@/features/reviews/server/trigger-review";
import { touchSyncRun } from "@repo/services";
import { prisma } from "@/lib/db";
import {
  getGitHubSyncPrConcurrency,
  getGitHubSyncRepoConcurrency,
} from "@repo/services/constants";

type GitHubRepository = {
  full_name: string;
};

export type ConnectedRepoRef = {
  full_name: string;
  installationId: number;
};

type GitHubPullRequest = {
  number: number;
  title: string;
  body: string | null;
  head: { sha: string; ref: string };
  base: { ref: string };
  user: { login: string } | null;
};

export type RepoSyncResult = {
  synced: number;
  changed: number;
  unchanged: number;
  queued: number;
  prCount: number;
};

export type RepoSyncFailure = {
  repoFullName: string;
  message: string;
};

function formatGitHubApiError(error: unknown): string {
  if (error && typeof error === "object") {
    const err = error as {
      status?: number;
      message?: string;
      response?: { data?: { message?: string } };
    };
    const detail =
      err.response?.data?.message?.trim() || err.message?.trim() || "Unknown error";
    if (err.status) {
      return `${err.status}: ${detail}`;
    }
    return detail;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

/** Get a shared octokit for a given installation — call once per sync, reuse everywhere. */
export async function getInstallationOctokit(installationId: number) {
  const app = getGitHubApp();
  return app.getInstallationOctokit(installationId);
}

export async function listInstallationRepositories(installationId: number) {
  const octokit = await getInstallationOctokit(installationId);

  const repositories = await octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
  );

  return repositories
    .filter((r) => Boolean(r.full_name))
    .map((r) => ({ full_name: r.full_name }));
}

async function listOpenPullRequests(octokit: Octokit, repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) return [] as GitHubPullRequest[];

  const { data } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "open",
    per_page: 100,
  });

  return data as GitHubPullRequest[];
}

export function repoStepId(repoFullName: string) {
  return repoFullName.replace(/[^a-zA-Z0-9]+/g, "-");
}

/**
 * Sync connected repos that may belong to different GitHub App installations
 * (e.g. personal vs org). Each installation is synced with its own octokit.
 */
export async function syncConnectedRepositories(
  repositories: ConnectedRepoRef[],
  syncRunId?: string,
) {
  const byInstallation = new Map<number, GitHubRepository[]>();

  for (const repo of repositories) {
    const list = byInstallation.get(repo.installationId) ?? [];
    list.push({ full_name: repo.full_name });
    byInstallation.set(repo.installationId, list);
  }

  let synced = 0;
  let changed = 0;
  let queued = 0;
  let failedRepos = 0;
  const totalRepos = repositories.length;
  const repoFailures: RepoSyncFailure[] = [];

  for (const [installationId, repos] of byInstallation) {
    const result = await syncAllRepositories({
      installationId,
      repositories: repos,
      syncRunId,
    });
    synced += result.synced;
    changed += result.changed;
    queued += result.queued;
    failedRepos += result.failedRepos;
    repoFailures.push(...result.repoFailures);
  }

  return { synced, changed, queued, failedRepos, totalRepos, repoFailures };
}

/** Sync all repos for an installation in parallel using a single shared octokit. */
export async function syncAllRepositories(input: {
  installationId: number;
  repositories: GitHubRepository[];
  syncRunId?: string;
}) {
  const repoFailures: RepoSyncFailure[] = [];
  let octokit: Octokit;

  try {
    octokit = await getInstallationOctokit(input.installationId);
  } catch (error) {
    const message = formatGitHubApiError(error);
    for (const repository of input.repositories) {
      repoFailures.push({
        repoFullName: repository.full_name,
        message,
      });
    }
    return {
      synced: 0,
      changed: 0,
      queued: 0,
      failedRepos: input.repositories.length,
      totalRepos: input.repositories.length,
      repoFailures,
    };
  }

  const canQueueReviews = isReviewPipelineConfigured();
  const repoLimit = pLimit(getGitHubSyncRepoConcurrency());

  let totalSynced = 0;
  let totalChanged = 0;
  let totalQueued = 0;
  let failedRepos = 0;

  const allReviewPayloads: Array<{
    installationId: number;
    repoFullName: string;
    prNumber: number;
    title: string;
    authorLogin: string;
    headSha: string;
    baseBranch: string;
  }> = [];

  await Promise.all(
    input.repositories.map((repository) =>
      repoLimit(async () => {
        try {
          const result = await syncRepoWithOctokit({
            installationId: input.installationId,
            repoFullName: repository.full_name,
            octokit,
            canQueueReviews,
            syncRunId: input.syncRunId,
          });

          totalSynced += result.synced;
          totalChanged += result.changed;
          allReviewPayloads.push(...result.reviewPayloads);
        } catch (error) {
          failedRepos += 1;
          repoFailures.push({
            repoFullName: repository.full_name,
            message: formatGitHubApiError(error),
          });
        } finally {
          if (input.syncRunId) {
            void touchSyncRun(input.syncRunId, {
              completedRepos: { increment: 1 },
            }).catch((error) => {
              console.error("[github/sync] touchSyncRun failed:", error);
            });
          }
        }
      }),
    ),
  );

  // Queue all reviews in parallel
  await Promise.all(
    allReviewPayloads.map((payload) =>
      queueReviewForPullRequest({ ...payload, action: "synchronize" }).catch(
        () => {},
      ),
    ),
  );

  totalQueued = allReviewPayloads.length;

  if (input.syncRunId && totalQueued > 0) {
    void touchSyncRun(input.syncRunId, {
      queuedReviews: { increment: totalQueued },
    }).catch(() => {});
  }

  return {
    synced: totalSynced,
    changed: totalChanged,
    queued: totalQueued,
    failedRepos,
    totalRepos: input.repositories.length,
    repoFailures,
  };
}

export function buildSyncFailureMessage(input: {
  failedRepos: number;
  totalRepos: number;
  repoFailures: RepoSyncFailure[];
}) {
  if (input.failedRepos === 0) {
    return null;
  }

  const formatPreview = (limit: number) => {
    const preview = input.repoFailures
      .slice(0, limit)
      .map((f) => `${f.repoFullName} (${f.message})`)
      .join("; ");
    const suffix =
      input.repoFailures.length > limit
        ? ` (+${input.repoFailures.length - limit} more)`
        : "";
    return preview ? `${preview}${suffix}` : null;
  };

  if (input.failedRepos < input.totalRepos) {
    const detail =
      formatPreview(2) ??
      `${input.failedRepos} repo${input.failedRepos === 1 ? "" : "s"} could not be reached`;
    return `GitHub sync failed for ${input.failedRepos} of ${input.totalRepos} repos: ${detail}`;
  }

  const detail = formatPreview(3);
  if (detail) {
    return `GitHub sync failed for every connected repo: ${detail}`;
  }

  return "GitHub sync failed for every connected repository. Reconnect the GitHub App, then disconnect and reconnect each repo on the Repositories page.";
}

async function syncRepoWithOctokit(input: {
  installationId: number;
  repoFullName: string;
  octokit: Octokit;
  canQueueReviews: boolean;
  syncRunId?: string;
}): Promise<{
  synced: number;
  changed: number;
  reviewPayloads: Array<{
    installationId: number;
    repoFullName: string;
    prNumber: number;
    title: string;
    authorLogin: string;
    headSha: string;
    baseBranch: string;
  }>;
}> {
  const pullRequests = await listOpenPullRequests(
    input.octokit,
    input.repoFullName,
  );

  if (pullRequests.length === 0) {
    return { synced: 0, changed: 0, reviewPayloads: [] };
  }

  // Fire-and-forget: tell the UI there are more PRs to show
  if (input.syncRunId) {
    void touchSyncRun(input.syncRunId, {
      totalPRs: { increment: pullRequests.length },
    }).catch(() => {});
  }

  const existingRows = await prisma.pullRequest.findMany({
    where: {
      repoFullName: input.repoFullName,
      prNumber: { in: pullRequests.map((pr) => pr.number) },
    },
    select: { prNumber: true, headSha: true, status: true },
  });

  const existingByNumber = new Map(
    existingRows.map((row) => [row.prNumber, row] as const),
  );

  const unchangedNumbers: number[] = [];
  const changedPRs: GitHubPullRequest[] = [];

  for (const pr of pullRequests) {
    const existing = existingByNumber.get(pr.number);
    if (existing && existing.headSha === pr.head.sha) {
      unchangedNumbers.push(pr.number);
    } else {
      changedPRs.push(pr);
    }
  }

  // Bump unchanged in one batch write — fire-and-forget
  if (unchangedNumbers.length > 0) {
    void prisma.pullRequest
      .updateMany({
        where: {
          repoFullName: input.repoFullName,
          prNumber: { in: unchangedNumbers },
        },
        data: { updatedAt: new Date() },
      })
      .catch(() => {});
  }

  if (changedPRs.length === 0) {
    return { synced: unchangedNumbers.length, changed: 0, reviewPayloads: [] };
  }

  const prLimit = pLimit(getGitHubSyncPrConcurrency());

  // Resolve feature links for all changed PRs in parallel
  const withLinks = await Promise.all(
    changedPRs.map((pr) =>
      prLimit(async () => {
        const existing = existingByNumber.get(pr.number);
        // Changed PRs (new or new commits) should re-queue unless already running.
        const shouldQueue =
          input.canQueueReviews && existing?.status !== "processing";

        const link = await resolveFeatureLink({
          repoFullName: input.repoFullName,
          branch: pr.head.ref,
          title: pr.title,
          body: pr.body,
        });

        return { pr, existing, shouldQueue, link };
      }),
    ),
  );

  // Batch-upsert all changed PRs in a single transaction
  const batchSize = getGitHubSyncPrConcurrency();

  const collectedPayloads: Array<{
    installationId: number;
    repoFullName: string;
    prNumber: number;
    title: string;
    authorLogin: string;
    headSha: string;
    baseBranch: string;
  }> = [];

  for (let i = 0; i < withLinks.length; i += batchSize) {
    const batch = withLinks.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map(({ pr, link }) =>
        prisma.pullRequest.upsert({
          where: {
            repoFullName_prNumber: {
              repoFullName: input.repoFullName,
              prNumber: pr.number,
            },
          },
          create: {
            installationId: input.installationId,
            repoFullName: input.repoFullName,
            prNumber: pr.number,
            title: pr.title,
            authorLogin: pr.user?.login ?? "unknown",
            headSha: pr.head.sha,
            baseBranch: pr.base.ref,
            status: "pending",
            featureRequestId: link.featureRequestId,
            projectId: link.projectId,
            repositoryId: link.repositoryId,
          },
          update: {
            installationId: input.installationId,
            title: pr.title,
            authorLogin: pr.user?.login ?? "unknown",
            headSha: pr.head.sha,
            baseBranch: pr.base.ref,
            status: "pending",
            reviewedAt: null,
            ...(link.featureRequestId
              ? { featureRequestId: link.featureRequestId }
              : {}),
            ...(link.projectId ? { projectId: link.projectId } : {}),
            ...(link.repositoryId ? { repositoryId: link.repositoryId } : {}),
          },
        }),
      ),
    );

    for (const { shouldQueue, pr } of batch) {
      if (shouldQueue) {
        collectedPayloads.push({
          installationId: input.installationId,
          repoFullName: input.repoFullName,
          prNumber: pr.number,
          title: pr.title,
          authorLogin: pr.user?.login ?? "unknown",
          headSha: pr.head.sha,
          baseBranch: pr.base.ref,
        });
      }
    }
  }

  if (input.syncRunId && changedPRs.length > 0) {
    void touchSyncRun(input.syncRunId, {
      completedPRs: { increment: changedPRs.length + unchangedNumbers.length },
      syncedPRs: { increment: changedPRs.length + unchangedNumbers.length },
      changedPRs: { increment: changedPRs.length },
    }).catch(() => {});
  }

  return {
    synced: unchangedNumbers.length + changedPRs.length,
    changed: changedPRs.length,
    reviewPayloads: collectedPayloads,
  };
}
