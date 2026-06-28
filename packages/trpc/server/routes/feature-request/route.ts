import { z } from "zod";
import {
  addClarification,
  createFeatureRequest,
  getFeatureRequest,
  getRequiredPlanApprovals,
  linkPullRequestToFeature,
  listFeatureRequests,
  listLinkablePullRequests,
  listPlanApprovals,
  sendReviewJob,
  unlinkPullRequestFromFeature,
  updateFeatureStatus,
} from "@repo/services";
import { prisma } from "@repo/database";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../trpc";

async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspace: { members: { some: { userId } } } },
  });

  if (!project) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  return project;
}

export const featureRequestRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.userId);
      return listFeatureRequests(input.projectId);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const feature = await getFeatureRequest(input.id);
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await assertProjectAccess(feature.projectId, ctx.userId);
      return feature;
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        title: z.string().min(3).max(200),
        description: z.string().min(10),
        source: z.enum(["manual", "email", "ticket", "call"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertProjectAccess(input.projectId, ctx.userId);

      const feature = await createFeatureRequest({
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        source: input.source,
        createdById: ctx.userId,
      });

      return feature;
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feature = await getFeatureRequest(input.id);
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await assertProjectAccess(feature.projectId, ctx.userId);
      return updateFeatureStatus(input.id, input.status);
    }),

  addClarification: protectedProcedure
    .input(
      z.object({
        featureRequestId: z.string(),
        content: z.string().min(1),
        role: z.enum(["user", "assistant"]).default("user"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const feature = await getFeatureRequest(input.featureRequestId);
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await assertProjectAccess(feature.projectId, ctx.userId);
      return addClarification(
        input.featureRequestId,
        input.role,
        input.content,
      );
    }),

  planApprovalStatus: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feature = await getFeatureRequest(input.featureRequestId);
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await assertProjectAccess(feature.projectId, ctx.userId);

      const [approvals, required] = await Promise.all([
        listPlanApprovals(input.featureRequestId),
        getRequiredPlanApprovals(feature.project.workspaceId),
      ]);

      return {
        approvals: approvals.map((approval) => ({
          id: approval.id,
          createdAt: approval.createdAt.toISOString(),
          reviewer: approval.reviewer,
        })),
        required,
        currentUserApproved: approvals.some(
          (approval) => approval.reviewerId === ctx.userId,
        ),
      };
    }),

  linkPullRequest: protectedProcedure
    .input(
      z.object({
        featureRequestId: z.string(),
        pullRequestId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const feature = await getFeatureRequest(input.featureRequestId);
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await assertProjectAccess(feature.projectId, ctx.userId);

      await linkPullRequestToFeature({
        pullRequestId: input.pullRequestId,
        featureRequestId: input.featureRequestId,
        workspaceId: feature.project.workspaceId,
      });

      // Linking should advance the workflow: move into review and (re)queue a
      // PRD-aware review for the freshly linked PR. This makes the tracker
      // progress immediately instead of waiting for a webhook.
      const pullRequest = await prisma.pullRequest.findUnique({
        where: { id: input.pullRequestId },
        select: {
          installationId: true,
          repoFullName: true,
          prNumber: true,
          title: true,
          authorLogin: true,
          headSha: true,
          baseBranch: true,
        },
      });

      let reviewQueued = false;

      if (pullRequest) {
        await prisma.pullRequest.update({
          where: { id: input.pullRequestId },
          data: { status: "pending" },
        });

        await updateFeatureStatus(input.featureRequestId, "in_review");

        try {
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
          reviewQueued = true;
        } catch {
          // Review pipeline may be unconfigured locally; linking still succeeds.
        }
      }

      return { ok: true, reviewQueued };
    }),

  unlinkPullRequest: protectedProcedure
    .input(z.object({ pullRequestId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pullRequest = await prisma.pullRequest.findFirst({
        where: { id: input.pullRequestId },
        include: { featureRequest: { include: { project: true } } },
      });

      if (!pullRequest?.featureRequest) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await assertProjectAccess(
        pullRequest.featureRequest.projectId,
        ctx.userId,
      );

      await unlinkPullRequestFromFeature({
        pullRequestId: input.pullRequestId,
        workspaceId: pullRequest.featureRequest.project.workspaceId,
      });

      return { ok: true };
    }),

  listLinkablePullRequests: protectedProcedure
    .input(z.object({ featureRequestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feature = await getFeatureRequest(input.featureRequestId);
      if (!feature) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await assertProjectAccess(feature.projectId, ctx.userId);

      return listLinkablePullRequests(
        feature.project.workspaceId,
        input.featureRequestId,
      );
    }),
});
