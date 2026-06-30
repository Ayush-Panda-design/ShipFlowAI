import { prisma } from "@/lib/db";
import { getInstallationOctokit } from "@/features/reviews/server/sync-github-worker";

type LiveRepo = {
  id: number;
  full_name: string;
};

async function listAllLiveRepos(installationId: number): Promise<LiveRepo[]> {
  const octokit = await getInstallationOctokit(installationId);
  const repositories = await octokit.paginate(
    octokit.rest.apps.listReposAccessibleToInstallation,
    { per_page: 100 },
  );

  return repositories
    .filter((repo) => repo.id != null && repo.full_name)
    .map((repo) => ({
      id: repo.id,
      full_name: repo.full_name,
    }));
}

async function resolveRepoOnGitHub(
  installationId: number,
  repoFullName: string,
): Promise<LiveRepo | null> {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    return null;
  }

  try {
    const octokit = await getInstallationOctokit(installationId);
    const { data } = await octokit.rest.repos.get({ owner, repo });
    if (!data.full_name || data.id == null) {
      return null;
    }
    return { id: data.id, full_name: data.full_name };
  } catch {
    return null;
  }
}

async function applyRepositoryRename(
  connectedId: string,
  projectId: string,
  oldFullName: string,
  newFullName: string,
  githubRepoId: number,
) {
  if (oldFullName === newFullName) {
    await prisma.connectedRepository.update({
      where: { id: connectedId },
      data: { githubRepoId },
    });
    return;
  }

  const existingAtNewName = await prisma.connectedRepository.findUnique({
    where: {
      projectId_repoFullName: { projectId, repoFullName: newFullName },
    },
  });

  if (existingAtNewName && existingAtNewName.id !== connectedId) {
    await prisma.$transaction([
      prisma.pullRequest.updateMany({
        where: { repositoryId: connectedId },
        data: { repositoryId: existingAtNewName.id },
      }),
      prisma.connectedRepository.delete({ where: { id: connectedId } }),
      prisma.connectedRepository.update({
        where: { id: existingAtNewName.id },
        data: { githubRepoId },
      }),
    ]);
    return;
  }

  await prisma.$transaction([
    prisma.pullRequest.updateMany({
      where: { repoFullName: oldFullName },
      data: { repoFullName: newFullName },
    }),
    prisma.reviewRule.updateMany({
      where: { repoFullName: oldFullName },
      data: { repoFullName: newFullName },
    }),
    prisma.connectedRepository.update({
      where: { id: connectedId },
      data: {
        repoFullName: newFullName,
        githubRepoId,
      },
    }),
  ]);
}

/**
 * When a repo is renamed on GitHub, our DB still stores the old owner/name.
 * Match by stable GitHub repo id (or API lookup) and update ShipFlow records.
 */
export async function reconcileRenamedRepositoriesForWorkspace(
  workspaceId: string,
  installationId: number,
) {
  const connected = await prisma.connectedRepository.findMany({
    where: { project: { workspaceId } },
    select: {
      id: true,
      projectId: true,
      repoFullName: true,
      githubRepoId: true,
    },
  });

  if (connected.length === 0) {
    return { updated: 0 };
  }

  const liveRepos = await listAllLiveRepos(installationId);
  const liveByName = new Set(liveRepos.map((repo) => repo.full_name));
  const liveById = new Map(liveRepos.map((repo) => [repo.id, repo.full_name]));

  let updated = 0;

  for (const record of connected) {
    if (liveByName.has(record.repoFullName)) {
      const live = liveRepos.find((r) => r.full_name === record.repoFullName);
      if (live && record.githubRepoId !== live.id) {
        await prisma.connectedRepository.update({
          where: { id: record.id },
          data: { githubRepoId: live.id },
        });
      }
      continue;
    }

    let resolved: LiveRepo | null = null;

    if (record.githubRepoId != null) {
      const newName = liveById.get(record.githubRepoId);
      if (newName) {
        resolved = { id: record.githubRepoId, full_name: newName };
      }
    }

    if (!resolved) {
      resolved = await resolveRepoOnGitHub(installationId, record.repoFullName);
    }

    if (resolved && resolved.full_name !== record.repoFullName) {
      await applyRepositoryRename(
        record.id,
        record.projectId,
        record.repoFullName,
        resolved.full_name,
        resolved.id,
      );
      updated += 1;
    }
  }

  return { updated };
}
