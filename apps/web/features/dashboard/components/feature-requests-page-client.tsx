"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  readLastFeature,
  clearLastFeature,
  type LastFeature,
} from "@/features/shipflow/lib/last-feature";

import { Button } from "@/components/ui/button";
import { ButtonLoadingLabel } from "@/components/ui/loading-illustration";
import { Card, CardContent } from "@/components/ui/card";
import {
  DashboardListFilters,
  filterBySearch,
} from "@/features/dashboard/components/dashboard-list-filters";
import {
  AutoHideScroll,
  dashboardPanelHeightClass,
} from "@/components/ui/auto-hide-scroll";
import { ProjectPicker } from "@/features/dashboard/components/project-picker";
import { FEATURE_STATUS_LABELS } from "@/features/dashboard/lib/routes";
import { FeatureStatusBadge } from "@/features/shipflow/components/feature-status-badge";
import { LoadingState } from "@/components/ui/loading-state";
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
  const [resume, setResume] = useState<LastFeature | null>(null);

  useEffect(() => {
    setResume(readLastFeature());
  }, []);

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

      {resume ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ArrowRight className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Continue where you left off
              </p>
              <p className="truncate text-sm font-medium">
                {resume.title}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {FEATURE_STATUS_LABELS[resume.status] ?? resume.status}
                </span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href={`/dashboard/feature-requests/${resume.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Resume
              <ArrowRight className="size-3.5" />
            </Link>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                clearLastFeature();
                setResume(null);
              }}
              className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

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
              {createMutation.isPending ? (
                <ButtonLoadingLabel>Creating…</ButtonLoadingLabel>
              ) : (
                "Create request"
              )}
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

      <AutoHideScroll
        className={`${dashboardPanelHeightClass} grid gap-3 overflow-auto pr-1`}
      >
        {isLoading ? (
          <LoadingState
            label="Loading feature requests"
            description="Fetching ideas and workflow status for this project."
            variant="features"
            className="py-8"
          />
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
      </AutoHideScroll>
    </div>
  );
}
