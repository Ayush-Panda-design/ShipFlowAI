"use client";

import { useMemo, useState } from "react";

import {
  DashboardListFilters,
  filterBySearch,
} from "@/features/dashboard/components/dashboard-list-filters";
import { ClickableReviewSection } from "@/features/dashboard/components/pull-request-review-dialog";
import { usePullRequestReviewDialog } from "@/features/dashboard/components/use-pull-request-review-dialog";
import { LoadingState } from "@/components/ui/loading-state";
import {
  AutoHideScroll,
  dashboardPanelHeightClass,
} from "@/components/ui/auto-hide-scroll";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";

const REVIEW_ACTIVITY_TYPES = new Set(["review_complete", "review_blocking"]);

export function ActivityFeed({ workspaceId }: { workspaceId: string }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const { openReview, dialog } = usePullRequestReviewDialog();

  const { data: events = [], isLoading } = trpc.workspace.listActivity.useQuery(
    { workspaceId },
    { enabled: Boolean(workspaceId) },
  );

  const typeOptions = useMemo(
    () => [...new Set(events.map((event) => event.type))].sort(),
    [events],
  );

  const filteredEvents = useMemo(() => {
    let items = filterBySearch(events, search, (event) =>
      [event.title, event.detail ?? "", event.type].join(" "),
    );

    if (typeFilter !== "all") {
      items = items.filter((event) => event.type === typeFilter);
    }

    return items;
  }, [events, search, typeFilter]);

  if (isLoading) {
    return (
      <LoadingState
        label="Loading activity"
        description="Pulling recent reviews, approvals, and workflow events."
        variant="activity"
        className="py-6"
      />
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No activity yet — reviews, approvals, and stale PR nudges appear here.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardListFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search activity title, detail, type…"
        resultCount={filteredEvents.length}
        totalCount={events.length}
      >
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All types</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </DashboardListFilters>

      {filteredEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity matches your filters.</p>
      ) : (
        <AutoHideScroll className={`${dashboardPanelHeightClass} overflow-auto pr-1`}>
          <ul className="space-y-3 text-sm">
          {filteredEvents.map((event) => {
            const isReviewEvent =
              Boolean(event.pullRequestId) &&
              REVIEW_ACTIVITY_TYPES.has(event.type);

            const content = (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{event.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </span>
                </div>
                {event.detail ? (
                  <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
                ) : null}
              </>
            );

            return (
              <li key={event.id}>
                {isReviewEvent ? (
                  <ClickableReviewSection
                    className={cn(
                      "w-full rounded-lg border p-3",
                      "hover:bg-muted/40",
                    )}
                    title="View AI review details"
                    onClick={() =>
                      openReview({ pullRequestId: event.pullRequestId! })
                    }
                  >
                    {content}
                  </ClickableReviewSection>
                ) : (
                  <div className="rounded-lg border p-3">{content}</div>
                )}
              </li>
            );
          })}
          </ul>
        </AutoHideScroll>
      )}
      {dialog}
    </div>
  );
}
