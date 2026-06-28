import { NextResponse } from "next/server";

import { getInstallationForUser } from "@/features/github/server/installation";
import { syncAllRepositories } from "@/features/reviews/server/sync-github-worker";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

/**
 * On-demand sync of the connected repos for a single feature's project.
 * Works without Inngest/webhooks (synchronous GitHub fetch), so newly opened
 * PRs become linkable immediately on both localhost and production.
 */
export async function POST(request: Request) {
  const session = await requireSession();

  const body = (await request.json().catch(() => null)) as {
    featureRequestId?: string;
  } | null;

  const featureRequestId = body?.featureRequestId;
  if (!featureRequestId) {
    return NextResponse.json(
      { error: "featureRequestId is required" },
      { status: 400 },
    );
  }

  const installation = await getInstallationForUser(session.user.id);
  if (!installation) {
    return NextResponse.json(
      { error: "GitHub App is not connected." },
      { status: 400 },
    );
  }

  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    select: {
      project: {
        select: {
          repositories: {
            select: { repoFullName: true, installationId: true },
          },
        },
      },
    },
  });

  if (!feature) {
    return NextResponse.json({ error: "Feature not found." }, { status: 404 });
  }

  // Only sync repos the requesting user's installation can access.
  const repositories = feature.project.repositories
    .filter((repo) => repo.installationId === installation.installationId)
    .map((repo) => ({ full_name: repo.repoFullName }));

  if (repositories.length === 0) {
    return NextResponse.json({ ok: true, synced: 0, changed: 0, repos: 0 });
  }

  try {
    const result = await syncAllRepositories({
      installationId: installation.installationId,
      repositories,
    });

    return NextResponse.json({
      ok: true,
      synced: result.synced,
      changed: result.changed,
      repos: repositories.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to sync pull requests.",
      },
      { status: 500 },
    );
  }
}
