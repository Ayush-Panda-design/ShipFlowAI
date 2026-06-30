"use client";

import { useCallback, useState } from "react";

import { PullRequestReviewDialog } from "@/features/dashboard/components/pull-request-review-dialog";
import { trpc } from "@/trpc/client";

export type PullRequestReviewTarget = {
  pullRequestId: string;
  title?: string;
  repoFullName?: string;
  prNumber?: number;
  reviewComment?: string | null;
  status?: string;
  reviewId?: string;
};

export function usePullRequestReviewDialog() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PullRequestReviewTarget | null>(null);

  const hasInlineComment = Boolean(target?.reviewComment);

  const { data: fetched, isLoading, isError } =
    trpc.review.getPullRequestReviewDetail.useQuery(
      {
        pullRequestId: target?.pullRequestId ?? "",
        reviewId: target?.reviewId,
      },
      {
        enabled: open && Boolean(target?.pullRequestId) && !hasInlineComment,
      },
    );

  const openReview = useCallback((next: PullRequestReviewTarget) => {
    setTarget(next);
    setOpen(true);
  }, []);

  const closeReview = useCallback(() => {
    setOpen(false);
    setTarget(null);
  }, []);

  const title = target?.title ?? fetched?.title ?? "Pull request";
  const repoFullName = target?.repoFullName ?? fetched?.repoFullName ?? "";
  const prNumber = target?.prNumber ?? fetched?.prNumber ?? 0;
  const reviewComment = target?.reviewComment ?? fetched?.reviewComment ?? null;
  const status = target?.status ?? fetched?.status ?? "pending";

  const dialog = target ? (
    <PullRequestReviewDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          closeReview();
          return;
        }
        setOpen(true);
      }}
      title={title}
      repoFullName={repoFullName}
      prNumber={prNumber}
      reviewComment={reviewComment}
      status={status}
      isLoading={isLoading && !hasInlineComment}
      loadError={isError && !hasInlineComment}
    />
  ) : null;

  return { openReview, dialog };
}
