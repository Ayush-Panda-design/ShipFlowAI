import { prisma } from "@repo/database";
import { SYNC_NO_PROGRESS_MS, SYNC_STALE_MS } from "./constants";
import { friendlySyncError } from "./sync-errors";

export type SyncRunStatus = "running" | "completed" | "failed";

export { friendlySyncError } from "./sync-errors";

export function buildSyncStatusMessage(syncRun: {
  status: string;
  totalRepos: number;
  totalPRs: number;
  changedPRs: number;
  queuedReviews: number;
  errorMessage: string | null;
}) {
  if (syncRun.status === "failed") {
    return friendlySyncError(syncRun.errorMessage);
  }

  if (syncRun.status !== "completed") {
    return null;
  }

  if (syncRun.totalRepos === 0) {
    return "No repositories connected in ShipFlow yet. Open Repositories, click Connect on a repo, then sync again.";
  }

  if (syncRun.totalPRs === 0) {
    return "No open pull requests — you're all caught up.";
  }

  if (syncRun.changedPRs === 0) {
    const prLabel = syncRun.totalPRs === 1 ? "pull request" : "pull requests";
    return `Checked ${syncRun.totalPRs} open ${prLabel} — already up to date.`;
  }

  const changedLabel =
    syncRun.changedPRs === 1 ? "pull request" : "pull requests";

  if (syncRun.queuedReviews > 0) {
    const reviewLabel =
      syncRun.queuedReviews === 1 ? "review" : "reviews";
    return `Updated ${syncRun.changedPRs} ${changedLabel} and queued ${syncRun.queuedReviews} ${reviewLabel}.`;
  }

  const repoLabel = syncRun.totalRepos === 1 ? "repo" : "repos";
  return `Updated ${syncRun.changedPRs} ${changedLabel} across ${syncRun.totalRepos} ${repoLabel}.`;
}

export async function markStaleSyncRunsFailed(workspaceId: string) {
  const staleBefore = new Date(Date.now() - SYNC_STALE_MS);
  const noProgressBefore = new Date(Date.now() - SYNC_NO_PROGRESS_MS);

  await prisma.syncRun.updateMany({
    where: {
      workspaceId,
      status: "running",
      totalRepos: 0,
      completedRepos: 0,
      startedAt: { lt: noProgressBefore },
    },
    data: {
      status: "failed",
      errorMessage:
        "Background sync could not start. On localhost, run pnpm inngest:dev in a second terminal.",
      finishedAt: new Date(),
    },
  });

  await prisma.syncRun.updateMany({
    where: {
      workspaceId,
      status: "running",
      updatedAt: { lt: staleBefore },
    },
    data: {
      status: "failed",
      errorMessage: "Sync timed out after 10 minutes without progress.",
      finishedAt: new Date(),
    },
  });
}

export async function findActiveSyncRun(workspaceId: string) {
  await markStaleSyncRunsFailed(workspaceId);

  return prisma.syncRun.findFirst({
    where: {
      workspaceId,
      status: "running",
    },
    orderBy: { startedAt: "desc" },
  });
}

export async function touchSyncRun(
  syncRunId: string,
  data: {
    totalRepos?: number;
    completedRepos?: number | { increment: number };
    totalPRs?: number | { increment: number };
    completedPRs?: number | { increment: number };
    syncedPRs?: { increment: number };
    changedPRs?: { increment: number };
    queuedReviews?: { increment: number };
  },
) {
  await prisma.syncRun.update({
    where: { id: syncRunId },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function failSyncRun(syncRunId: string, errorMessage: string) {
  await prisma.syncRun.update({
    where: { id: syncRunId },
    data: {
      status: "failed",
      errorMessage,
      finishedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export async function completeSyncRun(
  syncRunId: string,
  totals: { syncedPRs: number; changedPRs: number; queuedReviews: number },
) {
  await prisma.syncRun.update({
    where: { id: syncRunId },
    data: {
      status: "completed",
      syncedPRs: totals.syncedPRs,
      changedPRs: totals.changedPRs,
      queuedReviews: totals.queuedReviews,
      finishedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

export function serializeSyncRun(syncRun: {
  id: string;
  status: string;
  totalRepos: number;
  completedRepos: number;
  totalPRs: number;
  completedPRs: number;
  syncedPRs: number;
  changedPRs: number;
  queuedReviews: number;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  updatedAt: Date;
}) {
  const message = buildSyncStatusMessage(syncRun);

  return {
    id: syncRun.id,
    status: syncRun.status as SyncRunStatus,
    totalRepos: syncRun.totalRepos,
    completedRepos: syncRun.completedRepos,
    totalPRs: syncRun.totalPRs,
    completedPRs: syncRun.completedPRs,
    syncedPRs: syncRun.syncedPRs,
    changedPRs: syncRun.changedPRs,
    queuedReviews: syncRun.queuedReviews,
    errorMessage: syncRun.errorMessage,
    message,
    startedAt: syncRun.startedAt.toISOString(),
    finishedAt: syncRun.finishedAt?.toISOString() ?? null,
    updatedAt: syncRun.updatedAt.toISOString(),
  };
}
