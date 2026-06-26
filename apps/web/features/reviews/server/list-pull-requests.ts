import { prisma } from "@/lib/db";

export async function listPullRequestsForInstallation(installationId: number) {
  return prisma.pullRequest.findMany({
    where: { installationId },
    include: {
      featureRequest: { select: { id: true, title: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
