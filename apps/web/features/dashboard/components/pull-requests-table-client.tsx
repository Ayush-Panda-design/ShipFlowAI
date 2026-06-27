"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { RunReviewButton } from "@/features/dashboard/components/run-review-button";
import { SyncPullRequestsButton } from "@/features/dashboard/components/sync-pull-requests-button";
import {
  confidenceLabel,
  computeConfidenceScore,
} from "@/features/reviews/types/structured-review";
import { isInFlightPrStatus } from "@repo/services/constants";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";

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

  const { data, isLoading } = trpc.review.list.useQuery(undefined, {
    refetchInterval: (query) => {
      const pullRequests = query.state.data?.pullRequests ?? [];
      const hasInFlight = pullRequests.some((pullRequest) =>
        isInFlightPrStatus(pullRequest.status),
      );
      return hasInFlight ? 3000 : false;
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

    return items;
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
      <p className="text-sm text-muted-foreground">Loading pull requests…</p>
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
        <SyncPullRequestsButton />
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
        <div className="max-h-[min(70vh,720px)] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>PR</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Feature</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPullRequests.map((pullRequest) => (
                <TableRow key={pullRequest.id}>
                  <TableCell className="font-medium">
                    {pullRequest.repoFullName}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      #{pullRequest.prNumber}
                      {pullRequest.source === "ai" ? (
                        <span title="AI-generated">
                          <Bot className="size-3.5 text-violet-500" />
                        </span>
                      ) : null}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {pullRequest.title}
                  </TableCell>
                  <TableCell>@{pullRequest.authorLogin}</TableCell>
                  <TableCell className="text-xs">
                    {pullRequest.filesChanged != null ? (
                      <span
                        className={cn(
                          pullRequest.sizeWarning === "critical" && "text-destructive",
                          pullRequest.sizeWarning === "warn" && "text-amber-600",
                        )}
                        title={
                          pullRequest.sizeWarning
                            ? "Large PR — consider splitting before review"
                            : undefined
                        }
                      >
                        {pullRequest.sizeWarning ? (
                          <AlertTriangle className="mr-1 inline size-3" />
                        ) : null}
                        {pullRequest.filesChanged} files · {pullRequest.linesChanged ?? 0} lines
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate text-xs">
                    {pullRequest.featureRequest ? (
                      <Link
                        href={`${DASHBOARD_BASE_PATH}/feature-requests/${pullRequest.featureRequest.id}`}
                        className="hover:underline"
                      >
                        {pullRequest.featureRequest.title}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Unlinked</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {(() => {
                      const review = pullRequest.aiReviews[0];
                      if (!review) {
                        return (
                          <span className="text-muted-foreground">No review</span>
                        );
                      }
                      const score =
                        review.confidenceScore ??
                        computeConfidenceScore(
                          {
                            prdAlignment: review.prdAlignment ?? "",
                            findings: [],
                          },
                          {
                            blockingCount: review.blockingCount,
                            nonBlockingCount: review.nonBlockingCount,
                          },
                        );
                      return (
                        <span title={confidenceLabel(score)}>{score}%</span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-medium capitalize",
                        statusStyles[pullRequest.status] ??
                          "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {pullRequest.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RunReviewButton
                      pullRequestId={pullRequest.id}
                      disabled={!reviewConfigured}
                      label={
                        pullRequest.status === "failed" ? "Retry review" : "Run review"
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {new Date(pullRequest.updatedAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
