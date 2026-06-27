import { prisma } from "@repo/database";

import type { ReviewFindingInput } from "../review-rules";

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

export function parseReviewFindings(raw: string): ReviewFindingInput[] {
  try {
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      severity?: string;
      category?: string;
      title?: string;
      description?: string;
      filePath?: string;
      confidence?: number;
      codeSuggestion?: string;
    }>;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item, index) => {
      if (!item.title || !item.description) {
        return [];
      }

      const severity: ReviewFindingInput["severity"] =
        item.severity === "blocking" ? "blocking" : "non_blocking";

      return [
        {
          id: item.id ?? `finding-${index + 1}`,
          severity,
          category: item.category ?? "general",
          title: item.title,
          description: item.description,
          filePath: item.filePath,
          confidence: item.confidence,
          codeSuggestion: item.codeSuggestion,
        },
      ];
    });
  } catch {
    return [];
  }
}
