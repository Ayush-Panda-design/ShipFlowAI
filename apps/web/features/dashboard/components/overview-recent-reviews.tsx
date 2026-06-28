"use client";

import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { ClickableReviewSection } from "@/features/dashboard/components/pull-request-review-dialog";
import { usePullRequestReviewDialog } from "@/features/dashboard/components/use-pull-request-review-dialog";
import type { OverviewReviewItem } from "@/features/dashboard/server/overview-data";
import {
  statusStyles,
  type ReviewStatus,
} from "@/features/dashboard/lib/status-styles";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: ReviewStatus }) {
  const style = statusStyles[status];
  return (
    <Badge variant="outline" className={cn("font-medium", style.badgeClassName)}>
      {style.label}
    </Badge>
  );
}

export function OverviewRecentReviews({
  reviews,
}: {
  reviews: OverviewReviewItem[];
}) {
  const { openReview, dialog } = usePullRequestReviewDialog();

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No AI reviews yet. Connect the GitHub App and open a pull request.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {reviews.map((review) => (
          <ClickableReviewSection
            key={review.id}
            className="flex w-full flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            onClick={() =>
              openReview({
                pullRequestId: review.pullRequestId,
                title: review.pullRequest,
                repoFullName: review.repository,
                prNumber: review.prNumber,
                status: review.status === "approved" ? "reviewed" : review.status,
              })
            }
          >
            <div className="min-w-0 space-y-1 text-left">
              <p className="truncate font-medium">{review.pullRequest}</p>
              <p className="text-sm text-muted-foreground">
                {review.repository} #{review.prNumber} ·{" "}
                {formatDistanceToNow(review.updatedAt, { addSuffix: true })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {review.blockingCount > 0 ? (
                <Badge
                  variant="outline"
                  className="border-destructive/40 bg-destructive/10 text-destructive"
                >
                  {review.blockingCount} blocking
                </Badge>
              ) : null}
              <StatusBadge status={review.status} />
            </div>
          </ClickableReviewSection>
        ))}
      </div>
      {dialog}
    </>
  );
}
