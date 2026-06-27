import { inngest, type GitHubPrReceivedEvent } from "@/features/inngest/client";
import {
  AI_CREDIT_COSTS,
  loadMutedCategories,
  loadReviewRulesForWorkspace,
  resolveWorkspaceIdForFeature,
  resolveWorkspaceIdForInstallation,
  tryConsumeCredits,
} from "@repo/services";
import {
  enrichReview,
  generateReview,
} from "@/features/reviews/server/generate-review";
import { formatReviewComment } from "@/features/reviews/server/format-review-comment";
import { loadReviewContext } from "@/features/reviews/server/load-review-context";
import {
  markFeatureInReview,
  persistReviewResult,
  trySavePrMetrics,
} from "@/features/reviews/server/persist-review";
import { getPullRequestFiles } from "@/features/reviews/server/pr-files";
import { postPrComment } from "@/features/reviews/server/pr-comment";
import {
  applyCommentBudget,
  buildReviewChangeSummary,
  computePrSizeMetrics,
  filterSuppressedFindings,
  suggestPrSplit,
} from "@/features/reviews/server/review-noise";
import { parseFindings } from "@/features/reviews/types/structured-review";
import {
  buildPrNamespace,
  resolvePrContextChunks,
} from "@/features/reviews/server/vectors";
import { chunkPrFiles } from "@/features/reviews/utils/chunk-code";
import { prisma } from "@/lib/db";

async function updateReviewStage(pullRequestId: string, stage: string) {
  try {
    await prisma.pullRequest.update({
      where: { id: pullRequestId },
      data: { reviewComment: `Review in progress: ${stage}` },
    });
  } catch {
    // Non-critical progress hint.
  }
}

async function markPullRequestFailed(
  repoFullName: string,
  prNumber: number,
  errorMessage: string
) {
  await prisma.pullRequest.update({
    where: {
      repoFullName_prNumber: {
        repoFullName,
        prNumber,
      },
    },
    data: {
      status: "failed",
      reviewComment: `Review failed: ${errorMessage}`,
    },
  });
}

export const reviewPullRequest = inngest.createFunction(
  {
    id: "review-pull-request",
    retries: 3,
    timeouts: { finish: "20m" },
    triggers: [{ event: "github/pr.received" }],
    onFailure: async ({ event, error }) => {
      const originalEvent = event.data.event;
      const data = originalEvent.data as GitHubPrReceivedEvent;
      await markPullRequestFailed(
        data.repoFullName,
        data.prNumber,
        error.message ?? "Unknown error"
      );
    },
  },
  async ({ event, step }) => {
    const { installationId, repoFullName, prNumber, title } = event.data;

    const pullRequest = await step.run("load-pull-request", async () => {
      return prisma.pullRequest.findUnique({
        where: {
          repoFullName_prNumber: {
            repoFullName,
            prNumber,
          },
        },
        select: {
          id: true,
          featureRequestId: true,
        },
      });
    });

    if (!pullRequest) {
      throw new Error(`Pull request ${repoFullName}#${prNumber} not found`);
    }

    await step.run("consume-review-credit", async () => {
      const featureResolution = pullRequest.featureRequestId
        ? await resolveWorkspaceIdForFeature(pullRequest.featureRequestId)
        : null;
      const workspaceId =
        (featureResolution?.ok ? featureResolution.workspaceId : null) ??
        (await resolveWorkspaceIdForInstallation(installationId));

      const failure = await tryConsumeCredits(
        workspaceId,
        AI_CREDIT_COSTS.review,
      );

      if (failure?.code === "feature_not_found") {
        throw new Error("Feature request not found for review billing");
      }

      if (failure?.code === "workspace_not_found") {
        throw new Error("Workspace not found for review billing");
      }

      if (failure?.code === "insufficient_credits") {
        throw new Error(failure.message);
      }
    });

    await step.run("mark-processing", async () => {
      await prisma.pullRequest.update({
        where: { id: pullRequest.id },
        data: { status: "processing" },
      });
      await markFeatureInReview(pullRequest.featureRequestId);
    });

    const reviewContext = await step.run("load-review-context", async () => {
      return loadReviewContext(pullRequest.featureRequestId);
    });

    const fetchResult = await step.run("fetch-and-chunk", async () => {
      await updateReviewStage(pullRequest.id, "fetching changed files");

      const files = await getPullRequestFiles(
        installationId,
        repoFullName,
        prNumber
      );

      return {
        chunks: chunkPrFiles(prNumber, files),
        metrics: computePrSizeMetrics(files),
      };
    });

    const { chunks, metrics: prMetrics } = fetchResult;

    if (chunks.length === 0) {
      await step.run("mark-reviewed-no-code", async () => {
        const comment =
          "No reviewable code changes found in this pull request.";

        await trySavePrMetrics(pullRequest.id, prMetrics);

        await persistReviewResult({
          pullRequestId: pullRequest.id,
          featureRequestId: pullRequest.featureRequestId,
          review: {
            summary: comment,
            prdAlignment: reviewContext.prd
              ? "No code changes to evaluate against the PRD."
              : "No PRD linked.",
            findings: [],
          },
          blockingCount: 0,
          nonBlockingCount: 0,
          reviewComment: `## ShipFlow AI Review\n\n${comment}`,
        });
      });

      return { status: "reviewed", reason: "no-code-changes" };
    }

    const namespace = buildPrNamespace(repoFullName, prNumber);

    const contextChunks = await step.run("resolve-pr-context", async () => {
      await updateReviewStage(pullRequest.id, "selecting relevant code");
      return resolvePrContextChunks(namespace, chunks, title, 5);
    });

    const enrichedReview = await step.run("generate-review", async () => {
      await updateReviewStage(pullRequest.id, "running AI analysis");
      const workspaceId =
        (await resolveWorkspaceIdForInstallation(installationId)) ?? undefined;

      let rules: Awaited<ReturnType<typeof loadReviewRulesForWorkspace>> = [];
      let mutedCategories: string[] = [];

      try {
        [rules, mutedCategories] = await Promise.all([
          workspaceId
            ? loadReviewRulesForWorkspace(workspaceId, repoFullName)
            : Promise.resolve([]),
          workspaceId
            ? loadMutedCategories(workspaceId)
            : Promise.resolve([] as string[]),
        ]);
      } catch {
        // Learned rules are optional until migration is applied.
      }

      const previousReview = await prisma.aIReview.findFirst({
        where: { pullRequestId: pullRequest.id },
        orderBy: { createdAt: "desc" },
        select: { findings: true },
      });

      const review = await generateReview(title, contextChunks, reviewContext, {
        suppressedPatterns: rules.map((rule) => rule.pattern),
        mutedCategories,
      });

      const filtered = filterSuppressedFindings(
        review.findings,
        rules,
        mutedCategories,
      );
      const budgeted = applyCommentBudget(filtered);

      let summary = review.summary;
      if (budgeted.droppedNonBlockingCount > 0) {
        summary += `\n\n_Note: ${budgeted.droppedNonBlockingCount} lower-confidence non-blocking finding(s) omitted to reduce review noise._`;
      }

      if (prMetrics.sizeWarning) {
        const splitTips = suggestPrSplit(
          prMetrics.filesChanged,
          prMetrics.linesChanged,
        );
        if (splitTips) {
          summary += `\n\n⚠️ **Large PR** — consider splitting:\n${splitTips.map((tip) => `- ${tip}`).join("\n")}`;
        }
      }

      if (previousReview) {
        const changeSummary = buildReviewChangeSummary(
          parseFindings(previousReview.findings),
          budgeted.findings,
        );
        if (changeSummary.resolved.length > 0 || changeSummary.newIssues.length > 0) {
          summary += `\n\n**Since last review:** ${changeSummary.resolved.length} resolved, ${changeSummary.newIssues.length} new issue(s).`;
        }
      }

      const enriched = enrichReview({
        ...review,
        summary,
        findings: budgeted.findings,
      });

      return enriched;
    });

    const commentBody = formatReviewComment(enrichedReview.review, {
      blockingCount: enrichedReview.blockingCount,
      nonBlockingCount: enrichedReview.nonBlockingCount,
      confidenceScore: enrichedReview.confidenceScore,
      prdAware: Boolean(reviewContext.featureRequestId && reviewContext.prd),
    });

    await step.run("persist-review", async () => {
      await updateReviewStage(pullRequest.id, "saving results");
      const workspaceId = await resolveWorkspaceIdForInstallation(installationId);

      await trySavePrMetrics(pullRequest.id, prMetrics);

      await persistReviewResult({
        pullRequestId: pullRequest.id,
        featureRequestId: pullRequest.featureRequestId,
        review: enrichedReview.review,
        blockingCount: enrichedReview.blockingCount,
        nonBlockingCount: enrichedReview.nonBlockingCount,
        confidenceScore: enrichedReview.confidenceScore,
        reviewComment: commentBody,
        workspaceId,
      });
    });

    await step.run("post-pr-comment", async () => {
      try {
        await postPrComment(installationId, repoFullName, prNumber, commentBody);
      } catch (error) {
        console.error("[review] GitHub comment failed:", error);
      }
    });

    return {
      status: "reviewed",
      chunks: chunks.length,
      blocking: enrichedReview.blockingCount,
      nonBlocking: enrichedReview.nonBlockingCount,
    };
  }
);

