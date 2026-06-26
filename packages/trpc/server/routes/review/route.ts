import { z } from "zod";
import {
  AI_CREDIT_COSTS,
  assertHasCredits,
  resolveWorkspaceIdForInstallation,
  sendReviewJob,
} from "@repo/services";
import { TRPCError } from "@trpc/server";
import { prisma } from "@repo/database";

import { throwTrpcCreditError } from "../../credit-errors";
import { protectedProcedure, router } from "../../trpc";

const STALE_PROCESSING_MS = 5 * 60 * 1000;

export const reviewRouter = router({
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
        if (elapsedMs < STALE_PROCESSING_MS) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "Review already in progress. Wait a minute, then refresh the page.",
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
        message: "Review queued. Status will update in ~30–60 seconds.",
      };
    }),
});
