"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GitPullRequest, Bot, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  DashboardListFilters,
  filterBySearch,
} from "@/features/dashboard/components/dashboard-list-filters";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { RunReviewButton } from "@/features/dashboard/components/run-review-button";
import {
  ClickableReviewSection,
  PullRequestReviewDialog,
  pullRequestHasReviewNotes,
} from "@/features/dashboard/components/pull-request-review-dialog";
import { SyncPullRequestsButton } from "@/features/dashboard/components/sync-pull-requests-button";
import { LoadingState } from "@/components/ui/loading-state";
import {
  AutoHideScroll,
  dashboardPanelHeightClass,
} from "@/components/ui/auto-hide-scroll";
import {
  confidenceLabel,
  computeConfidenceScore,
} from "@/features/reviews/types/structured-review";
import { isInFlightPrStatus } from "@repo/services/constants";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";

function formatElapsed(updatedAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function shortRepoName(repoFullName: string) {
  const parts = repoFullName.split("/");
  return parts.length > 1 ? parts[parts.length - 1]! : repoFullName;
}

function compactUpdatedAt(updatedAt: string) {
  const date = new Date(updatedAt);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReviewStatusCell({
  status,
  reviewComment,
  updatedAt,
  confidenceScore,
}: {
  status: string;
  reviewComment: string | null;
  updatedAt: string;
  confidenceScore: number | null;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!isInFlightPrStatus(status)) {
      return;
    }

    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  const isFailed = status === "failed";
  const isProcessing = isInFlightPrStatus(status);
  const isReviewed = status === "reviewed" || status === "completed";
  const progressHint =
    reviewComment?.startsWith("Review in progress:")
      ? reviewComment.replace("Review in progress:", "").trim()
      : null;
  const failureMessage =
    isFailed && reviewComment
      ? reviewComment.replace(/^Review failed:\s*/i, "")
      : null;

  return (
    <div className="flex min-w-0 flex-col items-end gap-1.5 text-right">
      <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <Badge
          variant="outline"
          className={cn(
            "h-5 shrink-0 px-1.5 text-[10px] font-medium capitalize",
            statusStyles[status] ??
              "border-border bg-muted text-muted-foreground",
          )}
        >
          {status}
        </Badge>
        {confidenceScore != null && !isProcessing ? (
          <span
            className={cn(
              "text-[11px] tabular-nums",
              confidenceScore >= 80
                ? "text-emerald-600 dark:text-emerald-400"
                : confidenceScore >= 60
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
            )}
            title={confidenceLabel(confidenceScore)}
          >
            {confidenceScore}%
          </span>
        ) : null}
        {!isProcessing && confidenceScore == null && !isFailed ? (
          <span className="text-[11px] text-muted-foreground">No score</span>
        ) : null}
      </div>

      {isProcessing ? (
        <p className="line-clamp-2 text-[11px] leading-snug text-sky-600 dark:text-sky-400">
          {progressHint ?? "Queued"} · {formatElapsed(updatedAt)}
        </p>
      ) : null}

      {failureMessage ? (
        <p
          className="line-clamp-2 text-[11px] leading-snug text-destructive"
          title={failureMessage}
        >
          {failureMessage}
        </p>
      ) : null}

      {isReviewed && !isProcessing ? (
        <p
          className="text-[10px] text-muted-foreground/80"
          title={new Date(updatedAt).toLocaleString()}
        >
          {compactUpdatedAt(updatedAt)}
        </p>
      ) : null}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  processing:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400 animate-pulse",
  reviewed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  reviewing:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed:
    "border-destructive/30 bg-destructive/10 text-destructive",
};

type PullRequestsTableClientProps = {
  reviewConfigured: boolean;
};

export function PullRequestsTableClient({
  reviewConfigured,
}: PullRequestsTableClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [linkFilter, setLinkFilter] = useState("all");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedPullRequest, setSelectedPullRequest] = useState<{
    id: string;
    title: string;
    repoFullName: string;
    prNumber: number;
    reviewComment: string | null;
    status: string;
  } | null>(null);

  const { data, isLoading } = trpc.review.list.useQuery(undefined, {
    refetchInterval: (query) => {
      const pullRequests = query.state.data?.pullRequests ?? [];
      const hasInFlight = pullRequests.some((pullRequest) =>
        isInFlightPrStatus(pullRequest.status),
      );
      return hasInFlight ? 2000 : false;
    },
  });

  const pullRequests = data?.pullRequests ?? [];
  const accountLogin = data?.accountLogin;

  const filteredPullRequests = useMemo(() => {
    let items = filterBySearch(pullRequests, search, (pullRequest) =>
      [
        pullRequest.repoFullName,
        pullRequest.title,
        pullRequest.authorLogin,
        pullRequest.featureRequest?.title ?? "",
        String(pullRequest.prNumber),
        pullRequest.status,
      ].join(" "),
    );

    if (statusFilter !== "all") {
      items = items.filter((pullRequest) => pullRequest.status === statusFilter);
    }

    if (linkFilter === "linked") {
      items = items.filter((pullRequest) => Boolean(pullRequest.featureRequest));
    } else if (linkFilter === "unlinked") {
      items = items.filter((pullRequest) => !pullRequest.featureRequest);
    }

    const statusPriority: Record<string, number> = {
      processing: 0,
      pending: 1,
      failed: 2,
      reviewing: 3,
      reviewed: 4,
      completed: 5,
    };

    return [...items].sort((a, b) => {
      const pa = statusPriority[a.status] ?? 99;
      const pb = statusPriority[b.status] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [pullRequests, search, statusFilter, linkFilter]);

  const statusOptions = useMemo(
    () => [...new Set(pullRequests.map((pullRequest) => pullRequest.status))].sort(),
    [pullRequests],
  );

  const hasInFlight = useMemo(
    () => pullRequests.some((pullRequest) => isInFlightPrStatus(pullRequest.status)),
    [pullRequests],
  );

  if (isLoading && pullRequests.length === 0) {
    return (
      <LoadingState
        label="Loading pull requests"
        description="Syncing open PRs from your connected repositories."
        variant="pull-requests"
      />
    );
  }

  if (pullRequests.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GitPullRequest />
          </EmptyMedia>
          <EmptyTitle>No pull requests yet</EmptyTitle>
          <EmptyDescription>
            Open a pull request on a connected repository, or sync existing open
            PRs from GitHub.
          </EmptyDescription>
        </EmptyHeader>
        <SyncPullRequestsButton className="items-center" />
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pull Requests</h2>
          <p className="text-sm text-muted-foreground">
            PRs for @{accountLogin}
            {hasInFlight ? (
              <span className="ml-2 text-sky-600">· Live updates on</span>
            ) : null}
          </p>
        </div>
        <SyncPullRequestsButton />
      </div>

      <DashboardListFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search repo, title, author, feature…"
        resultCount={filteredPullRequests.length}
        totalCount={pullRequests.length}
      >
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={linkFilter}
          onChange={(event) => setLinkFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All links</option>
          <option value="linked">Linked to feature</option>
          <option value="unlinked">Unlinked</option>
        </select>
      </DashboardListFilters>

      {filteredPullRequests.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pull requests match your filters.</p>
      ) : (
        <AutoHideScroll
          className={`${dashboardPanelHeightClass} overflow-y-auto overflow-x-hidden rounded-lg border`}
        >
          <div className="sticky top-0 z-10 grid grid-cols-[2.75rem_minmax(0,1fr)_9rem] gap-x-3 border-b bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>PR</span>
            <span>Change</span>
            <span className="text-right">Review</span>
          </div>
          <div className="divide-y">
            {filteredPullRequests.map((pullRequest) => {
              const review = pullRequest.aiReviews[0];
              const inFlight = isInFlightPrStatus(pullRequest.status);
              const confidenceScore =
                !inFlight && review
                  ? review.confidenceScore ??
                    computeConfidenceScore(
                      {
                        prdAlignment: review.prdAlignment ?? "",
                        findings: [],
                      },
                      {
                        blockingCount: review.blockingCount,
                        nonBlockingCount: review.nonBlockingCount,
                      },
                    )
                  : null;

              return (
                <div
                  key={pullRequest.id}
                  className="grid grid-cols-[2.75rem_minmax(0,1fr)_9rem] items-start gap-x-3 px-3 py-2.5"
                >
                  <div className="pt-0.5">
                    <span className="inline-flex items-center gap-1 text-sm font-medium">
                      #{pullRequest.prNumber}
                      {pullRequest.source === "ai" ? (
                        <span title="AI-generated">
                          <Bot className="size-3.5 text-violet-500" />
                        </span>
                      ) : null}
                    </span>
                  </div>

                  <ClickableReviewSection
                    className="-mx-1 px-1 py-0.5"
                    title={
                      pullRequestHasReviewNotes(
                        pullRequest.reviewComment,
                        pullRequest.status,
                      )
                        ? "View AI review details"
                        : "View PR details"
                    }
                    onClick={() => {
                      setSelectedPullRequest({
                        id: pullRequest.id,
                        title: pullRequest.title,
                        repoFullName: pullRequest.repoFullName,
                        prNumber: pullRequest.prNumber,
                        reviewComment: pullRequest.reviewComment,
                        status: pullRequest.status,
                      });
                      setReviewDialogOpen(true);
                    }}
                  >
                    <p
                      className="truncate text-sm font-medium"
                      title={pullRequest.title}
                    >
                      {pullRequest.title}
                      {pullRequestHasReviewNotes(
                        pullRequest.reviewComment,
                        pullRequest.status,
                      ) ? (
                        <span className="sr-only"> — click to view review</span>
                      ) : null}
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs text-muted-foreground"
                      title={`${pullRequest.repoFullName} · @${pullRequest.authorLogin}`}
                    >
                      {shortRepoName(pullRequest.repoFullName)} · @{pullRequest.authorLogin}
                      {pullRequest.filesChanged != null ? (
                        <>
                          {" · "}
                          <span
                            className={cn(
                              pullRequest.sizeWarning === "critical" && "text-destructive",
                              pullRequest.sizeWarning === "warn" && "text-amber-600",
                            )}
                          >
                            {pullRequest.sizeWarning ? (
                              <AlertTriangle className="mr-0.5 inline size-3" />
                            ) : null}
                            {pullRequest.filesChanged}f / {pullRequest.linesChanged ?? 0}L
                          </span>
                        </>
                      ) : null}
                    </p>
                    {pullRequest.featureRequest ? (
                      <Link
                        href={`${DASHBOARD_BASE_PATH}/feature-requests/${pullRequest.featureRequest.id}`}
                        className="mt-0.5 block truncate text-xs text-primary hover:underline"
                        title={pullRequest.featureRequest.title}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {pullRequest.featureRequest.title}
                      </Link>
                    ) : (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Unlinked
                      </span>
                    )}
                  </ClickableReviewSection>

                  <div className="flex min-w-0 flex-col items-end gap-2">
                    <ReviewStatusCell
                      status={pullRequest.status}
                      reviewComment={pullRequest.reviewComment}
                      updatedAt={pullRequest.updatedAt}
                      confidenceScore={confidenceScore}
                    />
                    <RunReviewButton
                      pullRequestId={pullRequest.id}
                      status={pullRequest.status}
                      updatedAt={pullRequest.updatedAt}
                      disabled={!reviewConfigured}
                      compact
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </AutoHideScroll>
      )}

      {selectedPullRequest ? (
        <PullRequestReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          title={selectedPullRequest.title}
          repoFullName={selectedPullRequest.repoFullName}
          prNumber={selectedPullRequest.prNumber}
          reviewComment={selectedPullRequest.reviewComment}
          status={selectedPullRequest.status}
        />
      ) : null}
    </div>
  );
}
