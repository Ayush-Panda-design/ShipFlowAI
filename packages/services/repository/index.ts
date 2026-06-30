import { prisma } from "@repo/database";

import { assertWithinRepoLimit } from "../workspace";

export async function connectRepositoryToProject(input: {
  workspaceId: string;
  projectId: string;
  repoFullName: string;
  installationId: number;
  defaultBranch?: string;
  githubRepoId?: number;
}) {
  await assertWithinRepoLimit(input.workspaceId);

  return prisma.connectedRepository.upsert({
    where: {
      projectId_repoFullName: {
        projectId: input.projectId,
        repoFullName: input.repoFullName,
      },
    },
    create: {
      projectId: input.projectId,
      repoFullName: input.repoFullName,
      githubRepoId: input.githubRepoId,
      installationId: input.installationId,
      defaultBranch: input.defaultBranch ?? "main",
    },
    update: {
      installationId: input.installationId,
      defaultBranch: input.defaultBranch ?? "main",
      ...(input.githubRepoId != null ? { githubRepoId: input.githubRepoId } : {}),
    },
  });
}

export async function disconnectRepositoryFromProject(
  projectId: string,
  repoFullName: string,
) {
  return prisma.connectedRepository.deleteMany({
    where: { projectId, repoFullName },
  });
}

export async function listConnectedRepositoriesForWorkspace(workspaceId: string) {
  return prisma.connectedRepository.findMany({
    where: { project: { workspaceId } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
