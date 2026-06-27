import { prisma } from "@/lib/db";

export async function listPullRequestsForInstallation(installationId: number) {
  return prisma.pullRequest.findMany({
    where: { installationId },
    include: {
      featureRequest: { select: { id: true, title: true, status: true } },
      aiReviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          blockingCount: true,
          nonBlockingCount: true,
          prdAlignment: true,
          summary: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
