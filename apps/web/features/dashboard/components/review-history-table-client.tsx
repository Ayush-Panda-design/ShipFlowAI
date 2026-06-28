"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DashboardListFilters,
  filterBySearch,
} from "@/features/dashboard/components/dashboard-list-filters";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { ClickableReviewSection } from "@/features/dashboard/components/pull-request-review-dialog";
import { usePullRequestReviewDialog } from "@/features/dashboard/components/use-pull-request-review-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import {
  AutoHideScroll,
  dashboardPanelHeightClass,
} from "@/components/ui/auto-hide-scroll";
import { confidenceLabel } from "@/features/reviews/types/structured-review";
import { isInFlightPrStatus } from "@repo/services/constants";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";

function shortRepoName(repoFullName: string) {
  const parts = repoFullName.split("/");
  return parts.length > 1 ? parts[parts.length - 1]! : repoFullName;
}

export function ReviewHistoryTableClient() {
  const [search, setSearch] = useState("");
  const [blockingFilter, setBlockingFilter] = useState("all");
  const { openReview, dialog } = usePullRequestReviewDialog();

  const { data: listData } = trpc.review.list.useQuery(undefined, {
    refetchInterval: 4000,
  });

  const hasInFlight = (listData?.pullRequests ?? []).some((pullRequest) =>
    isInFlightPrStatus(pullRequest.status),
  );

  const { data, isLoading } = trpc.review.history.useQuery(undefined, {
    refetchInterval: hasInFlight ? 4000 : false,
  });

  const filteredReviews = useMemo(() => {
    const reviews = data?.reviews ?? [];
    let items = filterBySearch(reviews, search, (review) =>
      [
        review.pullRequest.repoFullName,
        review.pullRequest.title,
        review.featureRequest?.title ?? "",
        review.summary,
        String(review.pullRequest.prNumber),
      ].join(" "),
    );

    if (blockingFilter === "blocking") {
      items = items.filter((review) => review.blockingCount > 0);
    } else if (blockingFilter === "clean") {
      items = items.filter((review) => review.blockingCount === 0);
    }

    return items;
  }, [data?.reviews, search, blockingFilter]);

  if (isLoading && !data) {
    return (
      <LoadingState
        label="Loading review history"
        description="Gathering AI review results across your pull requests."
        variant="review"
      />
    );
  }

  if (!data?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub App not connected</CardTitle>
          <CardDescription>
            Install the GitHub App to see AI review history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={`${DASHBOARD_BASE_PATH}/github-app`} className="text-sm underline">
            Connect GitHub App
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (data.reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {hasInFlight
          ? "Review in progress — results will appear here when complete."
          : "No AI reviews yet."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DashboardListFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search repo, PR, feature, summary…"
        resultCount={filteredReviews.length}
        totalCount={data.reviews.length}
      >
        <select
          value={blockingFilter}
          onChange={(event) => setBlockingFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All reviews</option>
          <option value="blocking">With blocking issues</option>
          <option value="clean">0 blocking</option>
        </select>
      </DashboardListFilters>

      {filteredReviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews match your filters.</p>
      ) : (
        <AutoHideScroll
          className={`${dashboardPanelHeightClass} overflow-y-auto overflow-x-hidden rounded-lg border`}
        >
          <div className="sticky top-0 z-10 grid grid-cols-[2.75rem_minmax(0,1fr)_6.5rem] gap-x-3 border-b bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>PR</span>
            <span>Review</span>
            <span className="text-right">Result</span>
          </div>
          <div className="divide-y">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)_6.5rem] items-start gap-x-3 px-3 py-3"
              >
                <div className="pt-0.5 text-sm font-medium">
                  #{review.pullRequest.prNumber}
                </div>

                <ClickableReviewSection
                  className="-mx-1 px-1 py-0.5"
                  onClick={() =>
                    openReview({
                      pullRequestId: review.pullRequest.id,
                      title: review.pullRequest.title,
                      repoFullName: review.pullRequest.repoFullName,
                      prNumber: review.pullRequest.prNumber,
                      status: review.pullRequest.status,
                    })
                  }
                >
                  <p
                    className="truncate text-sm font-medium"
                    title={review.pullRequest.title}
                  >
                    {review.pullRequest.title}
                  </p>
                  <p
                    className="mt-0.5 truncate text-xs text-muted-foreground"
                    title={review.pullRequest.repoFullName}
                  >
                    {shortRepoName(review.pullRequest.repoFullName)}
                  </p>
                  <p
                    className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground"
                    title={review.summary}
                  >
                    {review.summary}
                  </p>
                  {review.featureRequest ? (
                    <Link
                      href={`${DASHBOARD_BASE_PATH}/feature-requests/${review.featureRequest.id}`}
                      className="mt-1 block truncate text-xs text-primary hover:underline"
                      title={review.featureRequest.title}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {review.featureRequest.title}
                    </Link>
                  ) : null}
                </ClickableReviewSection>

                <div className="flex min-w-0 flex-col items-end gap-1 pt-0.5 text-right">
                  {review.blockingCount > 0 ? (
                    <Badge
                      variant="outline"
                      className="border-destructive/40 text-[11px] text-destructive"
                    >
                      {review.blockingCount} blocking
                    </Badge>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">0 blocking</span>
                  )}
                  {review.confidenceScore != null ? (
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        review.confidenceScore >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground",
                      )}
                      title={confidenceLabel(review.confidenceScore)}
                    >
                      {review.confidenceScore}%
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  )}
                  <span
                    className="text-[11px] text-muted-foreground"
                    title={new Date(review.createdAt).toLocaleString()}
                  >
                    {formatDistanceToNow(new Date(review.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </AutoHideScroll>
      )}
      {dialog}
    </div>
  );
}
