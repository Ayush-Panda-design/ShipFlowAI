import { prisma } from "@repo/database";

export {
  buildReviewMarkdownFromAIReview,
  isStoredReviewComment,
  parseReviewFindings,
} from "./comment-utils";

export async function listPullRequestsForInstallation(installationId: number) {
  return prisma.pullRequest.findMany({
    where: { installationId },
    select: {
      id: true,
      repoFullName: true,
      prNumber: true,
      title: true,
      authorLogin: true,
      status: true,
      source: true,
      headSha: true,
      baseBranch: true,
      installationId: true,
      reviewComment: true,
      filesChanged: true,
      linesChanged: true,
      sizeWarning: true,
      createdAt: true,
      updatedAt: true,
      reviewedAt: true,
      featureRequest: { select: { id: true, title: true, status: true } },
      aiReviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          blockingCount: true,
          nonBlockingCount: true,
          prdAlignment: true,
          summary: true,
          confidenceScore: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}
