import { inngest, type GitHubPrReceivedEvent } from "@/features/inngest/client";
import {
  enrichReview,
  generateReview,
} from "@/features/reviews/server/generate-review";
import { formatReviewComment } from "@/features/reviews/server/format-review-comment";
import { loadReviewContext } from "@/features/reviews/server/load-review-context";
import {
  markFeatureInReview,
  persistReviewResult,
} from "@/features/reviews/server/persist-review";
import { getPullRequestFiles } from "@/features/reviews/server/pr-files";
import { postPrComment } from "@/features/reviews/server/pr-comment";
import {
  buildPrNamespace,
  saveChunksToPinecone,
  searchPrContext,
} from "@/features/reviews/server/vectors";
import { chunkPrFiles } from "@/features/reviews/utils/chunk-code";
import { prisma } from "@/lib/db";

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

    const chunks = await step.run("fetch-and-chunk", async () => {
      const files = await getPullRequestFiles(
        installationId,
        repoFullName,
        prNumber
      );
      return chunkPrFiles(prNumber, files);
    });

    if (chunks.length === 0) {
      await step.run("mark-reviewed-no-code", async () => {
        const comment =
          "No reviewable code changes found in this pull request.";

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

    await step.run("save-chunks-to-pinecone", async () => {
      await saveChunksToPinecone(namespace, chunks);
    });

    await step.sleep("wait-for-pinecone-indexing", "10s");

    const contextChunks = await step.run("search-pr-context", async () => {
      return searchPrContext(namespace, title, 5);
    });

    const enrichedReview = await step.run("generate-review", async () => {
      const review = await generateReview(title, contextChunks, reviewContext);
      return enrichReview(review);
    });

    const commentBody = formatReviewComment(enrichedReview.review, {
      blockingCount: enrichedReview.blockingCount,
      nonBlockingCount: enrichedReview.nonBlockingCount,
      prdAware: Boolean(reviewContext.featureRequestId && reviewContext.prd),
    });

    await step.run("post-pr-comment", async () => {
      await postPrComment(installationId, repoFullName, prNumber, commentBody);
    });

    await step.run("persist-review", async () => {
      await persistReviewResult({
        pullRequestId: pullRequest.id,
        featureRequestId: pullRequest.featureRequestId,
        review: enrichedReview.review,
        blockingCount: enrichedReview.blockingCount,
        nonBlockingCount: enrichedReview.nonBlockingCount,
        reviewComment: commentBody,
      });
    });

    return {
      status: "reviewed",
      chunks: chunks.length,
      blocking: enrichedReview.blockingCount,
      nonBlocking: enrichedReview.nonBlockingCount,
    };
  }
);
