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
};

export function usePullRequestReviewDialog() {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<PullRequestReviewTarget | null>(null);

  const needsFetch =
    open &&
    Boolean(target?.pullRequestId) &&
    !target?.reviewComment;

  const { data: fetched, isLoading } = trpc.review.getPullRequestReviewDetail.useQuery(
    { pullRequestId: target?.pullRequestId ?? "" },
    { enabled: needsFetch },
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
      isLoading={isLoading && needsFetch}
    />
  ) : null;

  return { openReview, dialog };
}
