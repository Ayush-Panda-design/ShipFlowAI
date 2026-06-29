import { NextResponse } from "next/server";

import { getInstallationForUser } from "@/features/github/server/installation";
import {
  buildSyncFailureMessage,
  syncConnectedRepositories,
} from "@/features/reviews/server/sync-github-worker";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import {
  completeSyncRun,
  failSyncRun,
  findActiveSyncRun,
  listConnectedRepositoriesForWorkspace,
  resolveWorkspaceIdForInstallation,
  serializeSyncRun,
  touchSyncRun,
} from "@repo/services";

/**
 * Fast, direct GitHub sync for connected repos only (no Inngest queue).
 * Returns the final sync status in one response so the UI is not waiting on
 * a background worker to start.
 */
export async function POST() {
  const session = await requireSession();
  const installation = await getInstallationForUser(session.user.id);

  if (!installation) {
    return NextResponse.json(
      { error: "GitHub App is not connected." },
      { status: 400 },
    );
  }

  const workspaceId =
    installation.workspaceId ??
    (await resolveWorkspaceIdForInstallation(installation.installationId));

  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const active = await findActiveSyncRun(workspaceId);
  if (active) {
    return NextResponse.json({
      ok: true,
      syncId: active.id,
      alreadyRunning: true,
      status: serializeSyncRun(active),
    });
  }

  const connected = await listConnectedRepositoriesForWorkspace(workspaceId);
  const activeInstallationId = installation.installationId;
  const repoByName = new Map<string, { full_name: string; installationId: number }>();
  for (const repo of connected) {
    repoByName.set(repo.repoFullName, {
      full_name: repo.repoFullName,
      installationId: activeInstallationId,
    });
  }
  const repositories = [...repoByName.values()];

  if (repositories.length === 0) {
    return NextResponse.json(
      {
        error:
          "Connect at least one repository before syncing. Open Repositories, click Connect on a repo, then try Sync from GitHub again.",
        code: "no_connected_repos",
      },
      { status: 400 },
    );
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      workspaceId,
      installationId: installation.installationId,
      status: "running",
      totalRepos: repositories.length,
    },
  });

  try {
    const result = await syncConnectedRepositories(repositories, syncRun.id);

    const failureMessage = buildSyncFailureMessage({
      failedRepos: result.failedRepos,
      totalRepos: result.totalRepos,
      repoFailures: result.repoFailures,
    });

    if (result.failedRepos === result.totalRepos && result.totalRepos > 0) {
      throw new Error(
        failureMessage ??
          "GitHub sync failed for every connected repository. Reconnect the GitHub App, then disconnect and reconnect each repo on the Repositories page.",
      );
    }

    if (failureMessage) {
      console.warn("[github/sync] partial repo failures:", failureMessage);
    }

    await touchSyncRun(syncRun.id, {
      completedRepos: repositories.length,
    });

    await completeSyncRun(syncRun.id, {
      syncedPRs: result.synced,
      changedPRs: result.changed,
      queuedReviews: result.queued,
    });

    const finished = await prisma.syncRun.findUniqueOrThrow({
      where: { id: syncRun.id },
    });

    return NextResponse.json({
      ok: true,
      syncId: syncRun.id,
      alreadyRunning: false,
      status: serializeSyncRun(finished),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "GitHub sync failed unexpectedly.";

    await failSyncRun(syncRun.id, message);

    const failed = await prisma.syncRun.findUniqueOrThrow({
      where: { id: syncRun.id },
    });

    return NextResponse.json(
      {
        ok: false,
        syncId: syncRun.id,
        error: message,
        status: serializeSyncRun(failed),
      },
      { status: 500 },
    );
  }
}
