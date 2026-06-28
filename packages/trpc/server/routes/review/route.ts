import { z } from "zod";
import {
  AI_CREDIT_COSTS,
  assertHasCredits,
  listPullRequestsForInstallation,
  parseReviewFindings,
  recordFindingFeedback,
  resolveWorkspaceIdForInstallation,
  sendGitHubSyncJob,
  sendReviewJob,
  findActiveSyncRun,
  serializeSyncRun,
  markStaleSyncRunsFailed,
} from "@repo/services";
import { isInFlightPrStatus, getStaleProcessingMs } from "@repo/services/constants";
import { TRPCError } from "@trpc/server";
import { prisma } from "@repo/database";

import { throwTrpcCreditError } from "../../credit-errors";
import { protectedProcedure, router } from "../../trpc";

async function requireInstallation(ctx: { userId: string }) {
  const installation = await prisma.gitHubInstallation.findUnique({
    where: { userId: ctx.userId },
  });

  if (!installation) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "GitHub App is not connected.",
    });
  }

  return installation;
}

async function requireWorkspaceId(installation: {
  installationId: number;
  workspaceId: string | null;
}) {
  const workspaceId =
    installation.workspaceId ??
    (await resolveWorkspaceIdForInstallation(installation.installationId));

  if (!workspaceId) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workspace not found.",
    });
  }

  return workspaceId;
}

export const reviewRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const installation = await prisma.gitHubInstallation.findUnique({
      where: { userId: ctx.userId },
    });

    if (!installation) {
      return { pullRequests: [], accountLogin: null as string | null };
    }

    const pullRequests = await listPullRequestsForInstallation(
      installation.installationId,
    );

    return {
      accountLogin: installation.accountLogin,
      pullRequests: pullRequests.map((pullRequest) => ({
        ...pullRequest,
        updatedAt: pullRequest.updatedAt.toISOString(),
        reviewedAt: pullRequest.reviewedAt?.toISOString() ?? null,
        createdAt: pullRequest.createdAt.toISOString(),
      })),
    };
  }),

  history: protectedProcedure.query(async ({ ctx }) => {
    const installation = await prisma.gitHubInstallation.findUnique({
      where: { userId: ctx.userId },
    });

    if (!installation) {
      return { connected: false as const, reviews: [] };
    }

    const reviews = await prisma.aIReview.findMany({
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
      take: 100,
    });

    return {
      connected: true as const,
      reviews: reviews.map((review) => ({
        id: review.id,
        summary: review.summary,
        blockingCount: review.blockingCount,
        nonBlockingCount: review.nonBlockingCount,
        confidenceScore: review.confidenceScore,
        createdAt: review.createdAt.toISOString(),
        pullRequest: review.pullRequest,
        featureRequest: review.featureRequest,
      })),
    };
  }),

  getStatus: protectedProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const installation = await prisma.gitHubInstallation.findUnique({
        where: { userId: ctx.userId },
      });

      if (!installation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const pullRequest = await prisma.pullRequest.findFirst({
        where: {
          id: input.pullRequestId,
          installationId: installation.installationId,
        },
        include: {
          aiReviews: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              blockingCount: true,
              nonBlockingCount: true,
              confidenceScore: true,
              summary: true,
              prdAlignment: true,
            },
          },
        },
      });

      if (!pullRequest) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return {
        id: pullRequest.id,
        status: pullRequest.status,
        updatedAt: pullRequest.updatedAt.toISOString(),
        sizeWarning: pullRequest.sizeWarning,
        filesChanged: pullRequest.filesChanged,
        linesChanged: pullRequest.linesChanged,
        source: pullRequest.source,
        latestReview: pullRequest.aiReviews[0] ?? null,
      };
    }),

  getPullRequestReviewDetail: protectedProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const installation = await requireInstallation(ctx);

      const pullRequest = await prisma.pullRequest.findFirst({
        where: {
          id: input.pullRequestId,
          installationId: installation.installationId,
        },
        select: {
          id: true,
          title: true,
          repoFullName: true,
          prNumber: true,
          reviewComment: true,
          status: true,
        },
      });

      if (!pullRequest) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pull request not found." });
      }

      return {
        id: pullRequest.id,
        title: pullRequest.title,
        repoFullName: pullRequest.repoFullName,
        prNumber: pullRequest.prNumber,
        reviewComment: pullRequest.reviewComment,
        status: pullRequest.status,
      };
    }),

  submitFindingFeedback: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        findingId: z.string(),
        feedback: z.enum(["helpful", "false_positive"]),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const installation = await prisma.gitHubInstallation.findUnique({
        where: { userId: ctx.userId },
      });

      if (!installation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const review = await prisma.aIReview.findFirst({
        where: {
          id: input.reviewId,
          pullRequest: { installationId: installation.installationId },
        },
        include: {
          pullRequest: { select: { repoFullName: true, installationId: true } },
        },
      });

      if (!review) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const workspaceId = await resolveWorkspaceIdForInstallation(
        review.pullRequest.installationId,
      );

      if (!workspaceId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      const findings = parseReviewFindings(review.findings);
      const finding = findings.find((item) => item.id === input.findingId);

      if (!finding) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Finding not found" });
      }

      return recordFindingFeedback({
        workspaceId,
        reviewId: input.reviewId,
        findingId: input.findingId,
        feedback: input.feedback,
        reason: input.reason,
        repoFullName: review.pullRequest.repoFullName,
        finding,
      });
    }),

  runReview: protectedProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const installation = await prisma.gitHubInstallation.findUnique({
        where: { userId: ctx.userId },
      });

      if (!installation) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "GitHub App is not connected.",
        });
      }

      const pullRequest = await prisma.pullRequest.findFirst({
        where: {
          id: input.pullRequestId,
          installationId: installation.installationId,
        },
      });

      if (!pullRequest) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pull request not found.",
        });
      }

      if (pullRequest.status === "processing") {
        const elapsedMs = Date.now() - pullRequest.updatedAt.getTime();
        if (elapsedMs < getStaleProcessingMs()) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Review already in progress.",
          });
        }
      }

      const workspaceId = await resolveWorkspaceIdForInstallation(
        installation.installationId,
      );

      if (!workspaceId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found.",
        });
      }

      try {
        await assertHasCredits(workspaceId, AI_CREDIT_COSTS.review);
      } catch (error) {
        throwTrpcCreditError(error);
      }

      await prisma.pullRequest.update({
        where: { id: pullRequest.id },
        data: { status: "pending" },
      });

      await sendReviewJob({
        installationId: pullRequest.installationId,
        repoFullName: pullRequest.repoFullName,
        prNumber: pullRequest.prNumber,
        title: pullRequest.title,
        authorLogin: pullRequest.authorLogin,
        headSha: pullRequest.headSha,
        baseBranch: pullRequest.baseBranch,
        action: "synchronize",
      });

      return {
        ok: true,
        pullRequestId: pullRequest.id,
        status: "pending" as const,
        message: "Review queued — status updates automatically.",
      };
    }),

  reviewSlaMetrics: protectedProcedure.query(async ({ ctx }) => {
    const installation = await prisma.gitHubInstallation.findUnique({
      where: { userId: ctx.userId },
    });

    if (!installation) {
      return { metrics: [] };
    }

    const pullRequests = await prisma.pullRequest.findMany({
      where: { installationId: installation.installationId },
      select: {
        repoFullName: true,
        prNumber: true,
        createdAt: true,
        reviewedAt: true,
        updatedAt: true,
        status: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const byRepo = new Map<
      string,
      { count: number; totalHoursToReview: number; reviewed: number }
    >();

    for (const pullRequest of pullRequests) {
      const bucket = byRepo.get(pullRequest.repoFullName) ?? {
        count: 0,
        totalHoursToReview: 0,
        reviewed: 0,
      };
      bucket.count += 1;
      if (pullRequest.reviewedAt) {
        const hours =
          (pullRequest.reviewedAt.getTime() - pullRequest.createdAt.getTime()) /
          (1000 * 60 * 60);
        bucket.totalHoursToReview += hours;
        bucket.reviewed += 1;
      }
      byRepo.set(pullRequest.repoFullName, bucket);
    }

    const metrics = [...byRepo.entries()].map(([repo, stats]) => ({
      repo,
      prCount: stats.count,
      avgHoursToFirstReview:
        stats.reviewed > 0
          ? Math.round((stats.totalHoursToReview / stats.reviewed) * 10) / 10
          : null,
    }));

    return { metrics };
  }),

  startSync: protectedProcedure.mutation(async ({ ctx }) => {
    const installation = await requireInstallation(ctx);
    const workspaceId = await requireWorkspaceId(installation);

    const active = await findActiveSyncRun(workspaceId);
    if (active) {
      return {
        syncId: active.id,
        alreadyRunning: true,
        status: serializeSyncRun(active),
      };
    }

    const syncRun = await prisma.syncRun.create({
      data: {
        workspaceId,
        installationId: installation.installationId,
        status: "running",
      },
    });

    await sendGitHubSyncJob({
      syncRunId: syncRun.id,
      installationId: installation.installationId,
      workspaceId,
    });

    return {
      syncId: syncRun.id,
      alreadyRunning: false,
      status: serializeSyncRun(syncRun),
    };
  }),

  getSyncStatus: protectedProcedure
    .input(z.object({ syncId: z.string() }))
    .query(async ({ ctx, input }) => {
      const installation = await requireInstallation(ctx);
      const workspaceId = await requireWorkspaceId(installation);

      await markStaleSyncRunsFailed(workspaceId);

      const syncRun = await prisma.syncRun.findFirst({
        where: {
          id: input.syncId,
          workspaceId,
        },
      });

      if (!syncRun) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sync not found." });
      }

      return serializeSyncRun(syncRun);
    }),

  getActiveSync: protectedProcedure.query(async ({ ctx }) => {
    const installation = await prisma.gitHubInstallation.findUnique({
      where: { userId: ctx.userId },
    });

    if (!installation) {
      return { active: false as const };
    }

    const workspaceId =
      installation.workspaceId ??
      (await resolveWorkspaceIdForInstallation(installation.installationId));

    if (!workspaceId) {
      return { active: false as const };
    }

    const active = await findActiveSyncRun(workspaceId);
    if (!active) {
      return { active: false as const };
    }

    return {
      active: true as const,
      status: serializeSyncRun(active),
    };
  }),
});

export { isInFlightPrStatus };
