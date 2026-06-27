"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DashboardListFilters,
  filterBySearch,
} from "@/features/dashboard/components/dashboard-list-filters";
import { ProjectPicker } from "@/features/dashboard/components/project-picker";
import { FEATURE_STATUS_LABELS } from "@/features/dashboard/lib/routes";
import { FeatureStatusBadge } from "@/features/shipflow/components/feature-status-badge";
import { trpc } from "@/trpc/client";

type FeatureRequestsPageClientProps = {
  projectId: string;
  projects: Array<{ id: string; name: string }>;
};

export function FeatureRequestsPageClient({
  projectId,
  projects,
}: FeatureRequestsPageClientProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const utils = trpc.useUtils();
  const { data: features = [], isLoading } = trpc.featureRequest.list.useQuery({
    projectId,
  });

  const createMutation = trpc.featureRequest.create.useMutation({
    onSuccess: async (feature) => {
      toast.success("Feature request created");
      await utils.featureRequest.list.invalidate({ projectId });
      window.location.href = `/dashboard/feature-requests/${feature.id}`;
    },
    onError: (error) => toast.error(error.message),
  });

  const statusOptions = useMemo(
    () => [...new Set(features.map((feature) => feature.status))].sort(),
    [features],
  );

  const filteredFeatures = useMemo(() => {
    let items = filterBySearch(features, search, (feature) =>
      [feature.title, feature.description, feature.status, feature.source].join(" "),
    );

    if (statusFilter !== "all") {
      items = items.filter((feature) => feature.status === statusFilter);
    }

    return items;
  }, [features, search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Feature Requests</h1>
          <p className="text-sm text-muted-foreground">
            Capture product ideas and run the ShipFlow delivery loop
          </p>
        </div>
        <ProjectPicker projects={projects} activeProjectId={projectId} />
      </div>

      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
          + New feature request
        </summary>
        <CardContent className="border-t px-4 pb-4 pt-3">
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const title = String(formData.get("title") ?? "").trim();
              const description = String(formData.get("description") ?? "").trim();
              const source = String(formData.get("source") ?? "manual") as
                | "manual"
                | "email"
                | "ticket"
                | "call";

              if (!title || !description) return;

              createMutation.mutate({
                projectId,
                title,
                description,
                source,
              });
            }}
          >
            <input
              name="title"
              placeholder="Feature title"
              className="rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <textarea
              name="description"
              placeholder="Describe the customer problem, context, and desired outcome..."
              className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">Intake source</span>
              <select
                name="source"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue="manual"
              >
                <option value="manual">Manual form</option>
                <option value="email">Email</option>
                <option value="ticket">Support ticket</option>
                <option value="call">Customer call</option>
              </select>
            </label>
            <Button
              type="submit"
              className="w-fit"
              disabled={createMutation.isPending}
            >
              <Plus className="mr-2 size-4" />
              {createMutation.isPending ? "Creating…" : "Create request"}
            </Button>
          </form>
        </CardContent>
      </details>

      <DashboardListFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title, description, status…"
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

      <div className="grid max-h-[min(70vh,720px)] gap-3 overflow-auto pr-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading features…</p>
        ) : filteredFeatures.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {features.length === 0
              ? "No feature requests in this project yet."
              : "No features match your filters."}
          </p>
        ) : (
          filteredFeatures.map((feature) => (
            <Link
              key={feature.id}
              href={`/dashboard/feature-requests/${feature.id}`}
            >
              <Card className="transition-colors hover:bg-muted/40">
                <CardContent className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">{feature.title}</p>
                    <p className="line-clamp-1 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                    <FeatureStatusBadge status={feature.status} />
                    <span>{feature._count.tasks} tasks</span>
                    {feature.prd && <span>PRD</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
