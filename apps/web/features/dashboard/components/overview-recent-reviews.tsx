"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronRight, GitPullRequest, OctagonAlert } from "lucide-react";

import { IllustratedEmptyState } from "@/components/illustrations/empty-state";
import { ClickableReviewSection } from "@/features/dashboard/components/pull-request-review-dialog";
import { usePullRequestReviewDialog } from "@/features/dashboard/components/use-pull-request-review-dialog";
import type { OverviewReviewItem } from "@/features/dashboard/server/overview-data";
import { statusStyles } from "@/features/dashboard/lib/status-styles";
import { cn } from "@/lib/utils";

export function OverviewRecentReviews({
  reviews,
}: {
  reviews: OverviewReviewItem[];
}) {
  const { openReview, dialog } = usePullRequestReviewDialog();

  if (reviews.length === 0) {
    return (
      <IllustratedEmptyState
        kind="reviews"
        size="compact"
        title="No AI reviews yet"
        description="Connect the GitHub App and open a pull request. Reviews appear here as soon as they finish."
      />
    );
  }

  return (
    <>
      <ul className="-mx-2 divide-y divide-border/70">
        {reviews.map((review, index) => {
          const style = statusStyles[review.status];
          const blocking = review.blockingCount > 0;
          return (
            <li key={review.id} className="sf-rise" style={{ animationDelay: `${index * 45}ms` }}>
              <ClickableReviewSection
                className="group/row flex w-full items-center gap-3.5 rounded-xl px-2 py-3.5 hover:bg-surface-sunken/70 sm:gap-4"
                onClick={() =>
                  openReview({
                    pullRequestId: review.pullRequestId,
                    reviewId: review.id,
                    title: review.pullRequest,
                    repoFullName: review.repository,
                    prNumber: review.prNumber,
                    status: review.status === "approved" ? "reviewed" : review.status,
                  })
                }
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl border border-border/70 transition-transform group-hover/row:scale-105",
                    style.tileClassName,
                  )}
                >
                  <GitPullRequest className="size-[18px]" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {review.pullRequest}
                  </span>
                  <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{review.repository}</span>
                    <span className="rounded-md bg-muted px-1.5 py-px font-mono text-[11px] text-foreground/70">
                      #{review.prNumber}
                    </span>
                    <span aria-hidden>·</span>
                    <time dateTime={review.updatedAt.toISOString()}>
                      {formatDistanceToNow(review.updatedAt, { addSuffix: true })}
                    </time>
                  </span>
                </span>

                <span className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                  {blocking ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-danger/25 bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger">
                      <OctagonAlert className="size-3.5" />
                      {review.blockingCount} blocking
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                      style.badgeClassName,
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", style.dotClassName)} />
                    {style.label}
                  </span>
                </span>

                <ChevronRight className="hidden size-4 shrink-0 text-text-subtle transition-transform group-hover/row:translate-x-0.5 sm:block" />
              </ClickableReviewSection>
            </li>
          );
        })}
      </ul>
      {dialog}
    </>
  );
}
