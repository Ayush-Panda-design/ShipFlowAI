import { z } from "zod";
import {
  AI_CREDIT_COSTS,
  assertHasCredits,
  getFeatureRequest,
  resolveWorkspaceIdForFeature,
  sendClarifyJob,
  sendPrdJob,
  sendTasksJob,
} from "@repo/services";
import { TRPCError } from "@trpc/server";
import { prisma } from "@repo/database";

import { throwTrpcCreditError } from "../../credit-errors";
import { protectedProcedure, router } from "../../trpc";

async function assertFeatureAccess(featureRequestId: string, userId: string) {
  const feature = await getFeatureRequest(featureRequestId);
  if (!feature) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Feature not found" });
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId: feature.project.workspaceId,
    },
  });

  if (!member) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }

  return feature;
}

async function requireCreditsForFeature(featureRequestId: string, cost: number) {
  const workspaceId = await resolveWorkspaceIdForFeature(featureRequestId);
  if (!workspaceId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  }

  try {
    await assertHasCredits(workspaceId, cost);
  } catch (error) {
    throwTrpcCreditError(error);
  }
}

export const shipflowRouter = router({
  triggerClarify: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertFeatureAccess(input.featureRequestId, ctx.userId);
      await requireCreditsForFeature(
        input.featureRequestId,
        AI_CREDIT_COSTS.clarify,
      );
      await sendClarifyJob(input.featureRequestId);
      return { ok: true };
    }),

  triggerPrd: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertFeatureAccess(input.featureRequestId, ctx.userId);
      await requireCreditsForFeature(
        input.featureRequestId,
        AI_CREDIT_COSTS.prd,
      );
      await sendPrdJob(input.featureRequestId);
      return { ok: true };
    }),

  triggerTasks: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertFeatureAccess(input.featureRequestId, ctx.userId);
      await requireCreditsForFeature(
        input.featureRequestId,
        AI_CREDIT_COSTS.tasks,
      );
      await sendTasksJob(input.featureRequestId);
      return { ok: true };
    }),
});
