import { prisma } from "@repo/database";

export async function linkPullRequestToFeature(input: {
  pullRequestId: string;
  featureRequestId: string;
  workspaceId: string;
}) {
  const [pullRequest, feature] = await Promise.all([
    prisma.pullRequest.findUnique({
      where: { id: input.pullRequestId },
      select: { id: true, installationId: true, repoFullName: true },
    }),
    prisma.featureRequest.findFirst({
      where: {
        id: input.featureRequestId,
        project: { workspaceId: input.workspaceId },
      },
      select: { id: true, projectId: true },
    }),
  ]);

  if (!pullRequest) {
    throw new Error("Pull request not found");
  }

  if (!feature) {
    throw new Error("Feature request not found in this workspace");
  }

  const repo = await prisma.connectedRepository.findFirst({
    where: {
      projectId: feature.projectId,
      repoFullName: pullRequest.repoFullName,
    },
    select: { id: true },
  });

  if (!repo) {
    throw new Error(
      "Pull request repository is not connected to this feature's project",
    );
  }

  return prisma.pullRequest.update({
    where: { id: input.pullRequestId },
    data: {
      featureRequestId: input.featureRequestId,
      repositoryId: repo.id,
      projectId: feature.projectId,
    },
  });
}

export async function unlinkPullRequestFromFeature(input: {
  pullRequestId: string;
  workspaceId: string;
}) {
  const pullRequest = await prisma.pullRequest.findFirst({
    where: {
      id: input.pullRequestId,
      featureRequest: { project: { workspaceId: input.workspaceId } },
    },
  });

  if (!pullRequest) {
    throw new Error("Pull request not found");
  }

  return prisma.pullRequest.update({
    where: { id: input.pullRequestId },
    data: {
      featureRequestId: null,
      repositoryId: null,
      projectId: null,
    },
  });
}

export async function listLinkablePullRequests(
  workspaceId: string,
  featureRequestId: string,
) {
  const feature = await prisma.featureRequest.findFirst({
    where: { id: featureRequestId, project: { workspaceId } },
    include: {
      project: {
        include: {
          repositories: {
            select: { repoFullName: true, installationId: true },
          },
        },
      },
    },
  });

  if (!feature) {
    throw new Error("Feature request not found");
  }

  const connectedRepos = feature.project.repositories;
  if (connectedRepos.length === 0) {
    return {
      pullRequests: [],
      emptyReason: "no_connected_repos" as const,
      connectedRepos: [] as string[],
    };
  }

  const repoNames = connectedRepos.map((repo) => repo.repoFullName);
  const installationIds = [
    ...new Set(connectedRepos.map((repo) => repo.installationId)),
  ];

  const installationFilter =
    installationIds.length === 1
      ? installationIds[0]!
      : { in: installationIds };

  const pullRequests = await prisma.pullRequest.findMany({
    where: {
      installationId: installationFilter,
      repoFullName: { in: repoNames },
      featureRequestId: null,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      repoFullName: true,
      prNumber: true,
      title: true,
      status: true,
    },
  });

  if (pullRequests.length > 0) {
    return {
      pullRequests,
      emptyReason: null,
      connectedRepos: repoNames,
    };
  }

  const syncedCount = await prisma.pullRequest.count({
    where: {
      installationId: installationFilter,
      repoFullName: { in: repoNames },
    },
  });

  return {
    pullRequests: [],
    emptyReason:
      syncedCount === 0 ? ("no_synced_prs" as const) : ("all_linked" as const),
    connectedRepos: repoNames,
  };
}
