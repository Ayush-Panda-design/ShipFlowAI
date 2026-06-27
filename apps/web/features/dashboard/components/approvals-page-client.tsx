"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  DashboardListFilters,
  filterBySearch,
} from "@/features/dashboard/components/dashboard-list-filters";
import { FEATURE_STATUS_LABELS } from "@/features/dashboard/lib/routes";
import { FeatureStatusBadge } from "@/features/shipflow/components/feature-status-badge";
import {
  ApprovalHistory,
  ReleaseApprovalPanel,
} from "@/features/shipflow/components/release-approval-panel";

type ApprovalFeature = {
  id: string;
  title: string;
  status: string;
  approvals: Array<{
    id: string;
    decision: string;
    notes: string | null;
    createdAt: Date;
    reviewer: { name: string; email: string };
  }>;
};

type ApprovalsPageClientProps = {
  features: ApprovalFeature[];
};

export function ApprovalsPageClient({ features }: ApprovalsPageClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statusOptions = useMemo(
    () => [...new Set(features.map((feature) => feature.status))].sort(),
    [features],
  );

  const filteredFeatures = useMemo(() => {
    let items = filterBySearch(features, search, (feature) =>
      [feature.title, feature.status].join(" "),
    );

    if (statusFilter !== "all") {
      items = items.filter((feature) => feature.status === statusFilter);
    }

    return items;
  }, [features, search, statusFilter]);

  if (features.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No features awaiting release approval.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <DashboardListFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search feature title…"
        resultCount={filteredFeatures.length}
        totalCount={features.length}
      >
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {FEATURE_STATUS_LABELS[status] ?? status}
            </option>
          ))}
        </select>
      </DashboardListFilters>

      {filteredFeatures.length === 0 ? (
        <p className="text-sm text-muted-foreground">No features match your filters.</p>
      ) : (
        <div className="max-h-[min(75vh,800px)] space-y-4 overflow-auto pr-1">
          {filteredFeatures.map((feature) => (
            <Card key={feature.id}>
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/dashboard/feature-requests/${feature.id}`}
                      className="font-medium hover:underline"
                    >
                      {feature.title}
                    </Link>
                    <div className="mt-1">
                      <FeatureStatusBadge status={feature.status} />
                    </div>
                  </div>
                </div>
                <ReleaseApprovalPanel
                  featureRequestId={feature.id}
                  status={feature.status}
                />
                <ApprovalHistory approvals={feature.approvals} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
