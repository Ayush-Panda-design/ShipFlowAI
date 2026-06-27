import type { StructuredReview } from "@/features/reviews/types/structured-review";
import { sendReleaseReadinessJob } from "@repo/services";
import { prisma } from "@/lib/db";

type PersistReviewInput = {
  pullRequestId: string;
  featureRequestId: string | null;
  review: StructuredReview;
  blockingCount: number;
  nonBlockingCount: number;
  confidenceScore?: number;
  reviewComment: string;
};

export async function persistReviewResult(input: PersistReviewInput) {
  const reviewedAt = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.pullRequest.update({
      where: { id: input.pullRequestId },
      data: {
        status: "reviewed",
        reviewComment: input.reviewComment,
        reviewedAt,
      },
    });

    await tx.aIReview.create({
      data: {
        pullRequestId: input.pullRequestId,
        featureRequestId: input.featureRequestId,
        summary: input.review.summary,
        findings: JSON.stringify(input.review.findings),
        blockingCount: input.blockingCount,
        nonBlockingCount: input.nonBlockingCount,
        confidenceScore: input.confidenceScore ?? null,
        prdAlignment: input.review.prdAlignment,
        status: "completed",
      },
    });

    if (!input.featureRequestId) {
      return;
    }

    const nextStatus =
      input.blockingCount > 0 ? "fix_needed" : "release_checking";

    await tx.featureRequest.update({
      where: { id: input.featureRequestId },
      data: { status: nextStatus },
    });
  });

  if (input.featureRequestId && input.blockingCount === 0) {
    await sendReleaseReadinessJob(input.featureRequestId);
  }
}

export async function markFeatureInReview(featureRequestId: string | null) {
  if (!featureRequestId) {
    return;
  }

  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    select: { status: true },
  });

  if (!feature) {
    return;
  }

  const skipStatuses = new Set(["shipped", "rejected", "duplicate"]);

  if (skipStatuses.has(feature.status)) {
    return;
  }

  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: { status: "in_review" },
  });
}
