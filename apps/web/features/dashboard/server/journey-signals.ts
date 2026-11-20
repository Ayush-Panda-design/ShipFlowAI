import {
  getInstallationForUser,
} from "@/features/github/server/installation";
import { prisma } from "@/lib/db";
import { countConnectedRepositories } from "@repo/services";

/** Read-only counts that describe how far a workspace has progressed through the ShipFlow loop. */
export type JourneySignals = {
  githubSignedIn: boolean;
  githubAppConnected: boolean;
  connectedRepos: number;
  projectCount: number;
  featureCount: number;
  prdCount: number;
  taskCount: number;
  reviewCount: number;
  shippedCount: number;
  awaitingApprovalCount: number;
  openPullRequests: number;
};

export async function getJourneySignals(
  userId: string,
  workspaceId: string,
): Promise<JourneySignals> {
  const installation = await getInstallationForUser(userId);

  const [
    githubAccount,
    connectedRepos,
    projectCount,
    featureCount,
    prdCount,
    taskCount,
    shippedCount,
    awaitingApprovalCount,
    reviewCount,
    openPullRequests,
  ] = await Promise.all([
    prisma.account.findFirst({
      where: { userId, providerId: "github" },
      select: { id: true },
    }),
    countConnectedRepositories(workspaceId),
    prisma.project.count({ where: { workspaceId } }),
    prisma.featureRequest.count({ where: { project: { workspaceId } } }),
    prisma.pRD.count({ where: { featureRequest: { project: { workspaceId } } } }),
    prisma.task.count({ where: { featureRequest: { project: { workspaceId } } } }),
    prisma.featureRequest.count({
      where: { project: { workspaceId }, status: "shipped" },
    }),
    prisma.featureRequest.count({
      where: {
        project: { workspaceId },
        status: { in: ["awaiting_approval", "fix_needed", "release_checking"] },
      },
    }),
    installation
      ? prisma.aIReview.count({
          where: { pullRequest: { installationId: installation.installationId } },
        })
      : Promise.resolve(0),
    installation
      ? prisma.pullRequest.count({
          where: {
            installationId: installation.installationId,
            status: { in: ["pending", "processing", "reviewing"] },
          },
        })
      : Promise.resolve(0),
  ]);

  return {
    githubSignedIn: Boolean(githubAccount),
    githubAppConnected: Boolean(installation),
    connectedRepos,
    projectCount,
    featureCount,
    prdCount,
    taskCount,
    reviewCount,
    shippedCount,
    awaitingApprovalCount,
    openPullRequests,
  };
}
