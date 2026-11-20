import { getInstallationForUser } from "@/features/github/server/installation";
import { isGitHubAppConfigured } from "@/features/github/utils/github-app";
import type { ReviewStatus } from "@/features/dashboard/lib/status-styles";
import { prisma } from "@/lib/db";
import { countConnectedRepositories } from "@repo/services";

export type OverviewReviewItem = {
  id: string;
  pullRequestId: string;
  repository: string;
  pullRequest: string;
  prNumber: number;
  status: ReviewStatus;
  blockingCount: number;
  updatedAt: Date;
  featureRequestId: string | null;
  featureTitle: string | null;
};

export type OverviewData = {
  connectedRepos: number;
  repoLimit: number;
  openPullRequests: number;
  reviewsThisWeek: number;
  featureRequestCount: number;
  prdCount: number;
  awaitingApprovalCount: number;
  githubApp: {
    status: "connected" | "disconnected" | "error";
    label: string;
    detail: string;
  };
  recentReviews: OverviewReviewItem[];
  /** Task count across the workspace (planning pipeline stage). */
  taskCount: number;
  /** AI reviews created per day for the trailing 7 days, oldest first. */
  reviewsByDay: { date: string; count: number }[];
};

function mapReviewStatus(
  prStatus: string,
  blockingCount: number,
): ReviewStatus {
  if (prStatus === "failed") return "failed";
  if (prStatus === "processing" || prStatus === "reviewing") return "in_progress";
  if (blockingCount > 0) return "changes_requested";
  if (prStatus === "reviewed" || prStatus === "completed") return "approved";
  return "pending";
}

export async function getOverviewData(
  userId: string,
  workspaceId: string,
): Promise<OverviewData> {
  const installation = await getInstallationForUser(userId);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { repoLimit: true },
  });

  const [
    connectedRepos,
    featureRequestCount,
    prdCount,
    awaitingApprovalCount,
    taskCount,
  ] = await Promise.all([
    countConnectedRepositories(workspaceId),
    prisma.featureRequest.count({ where: { project: { workspaceId } } }),
    prisma.pRD.count({ where: { featureRequest: { project: { workspaceId } } } }),
    prisma.featureRequest.count({
      where: {
        project: { workspaceId },
        status: { in: ["awaiting_approval", "fix_needed", "release_checking"] },
      },
    }),
    prisma.task.count({ where: { featureRequest: { project: { workspaceId } } } }),
  ]);

  let openPullRequests = 0;
  let reviewsThisWeek = 0;
  let recentReviews: OverviewReviewItem[] = [];
  let weekReviewDates: Date[] = [];

  if (installation) {
    [openPullRequests, reviewsThisWeek, recentReviews, weekReviewDates] = await Promise.all([
      prisma.pullRequest.count({
        where: {
          installationId: installation.installationId,
          status: { in: ["pending", "processing", "reviewing"] },
        },
      }),
      prisma.aIReview.count({
        where: {
          pullRequest: { installationId: installation.installationId },
          createdAt: { gte: weekAgo },
        },
      }),
      prisma.aIReview.findMany({
        where: { pullRequest: { installationId: installation.installationId } },
        include: {
          pullRequest: {
            select: {
              id: true,
              repoFullName: true,
              prNumber: true,
              title: true,
              status: true,
            },
          },
          featureRequest: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }).then((rows) =>
        rows.map((review) => ({
          id: review.id,
          pullRequestId: review.pullRequest.id,
          repository: review.pullRequest.repoFullName,
          pullRequest: review.pullRequest.title,
          prNumber: review.pullRequest.prNumber,
          status: mapReviewStatus(
            review.pullRequest.status,
            review.blockingCount,
          ),
          blockingCount: review.blockingCount,
          updatedAt: review.createdAt,
          featureRequestId: review.featureRequest?.id ?? null,
          featureTitle: review.featureRequest?.title ?? null,
        })),
      ),
      prisma.aIReview
        .findMany({
          where: {
            pullRequest: { installationId: installation.installationId },
            createdAt: { gte: weekAgo },
          },
          select: { createdAt: true },
        })
        .then((rows) => rows.map((row) => row.createdAt)),
    ]);
  }

  const reviewsByDay = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return {
      date: day.toISOString(),
      count: weekReviewDates.filter((d) => d >= day && d < next).length,
    };
  });

  const githubApp = (() => {
    if (!isGitHubAppConfigured()) {
      return {
        status: "error" as const,
        label: "Not configured",
        detail: "Add GitHub App env vars on the server",
      };
    }
    if (!installation) {
      return {
        status: "disconnected" as const,
        label: "Not connected",
        detail: "Install the GitHub App to sync repositories",
      };
    }
    return {
      status: "connected" as const,
      label: "Connected",
      detail: `Installed on @${installation.accountLogin}`,
    };
  })();

  return {
    connectedRepos,
    repoLimit: workspace?.repoLimit ?? 2,
    openPullRequests,
    reviewsThisWeek,
    featureRequestCount,
    prdCount,
    awaitingApprovalCount,
    githubApp,
    recentReviews,
    taskCount,
    reviewsByDay,
  };
}
