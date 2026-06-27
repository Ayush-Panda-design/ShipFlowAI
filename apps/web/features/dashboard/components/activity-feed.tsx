"use client";

import { useMemo, useState } from "react";

import {
  DashboardListFilters,
  filterBySearch,
} from "@/features/dashboard/components/dashboard-list-filters";
import { trpc } from "@/trpc/client";

export function ActivityFeed({ workspaceId }: { workspaceId: string }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

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
    return <p className="text-sm text-muted-foreground">Loading activity…</p>;
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
        <ul className="max-h-[min(70vh,720px)] space-y-3 overflow-auto pr-1 text-sm">
          {filteredEvents.map((event) => (
            <li key={event.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{event.title}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              </div>
              {event.detail ? (
                <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
