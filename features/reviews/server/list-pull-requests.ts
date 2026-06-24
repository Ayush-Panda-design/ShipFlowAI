import { prisma } from "@/lib/db";

export async function listPullRequestsForInstallation(installationId: number) {
  return prisma.pullRequest.findMany({
    where: { installationId },
    orderBy: { updatedAt: "desc" },
  });
}
