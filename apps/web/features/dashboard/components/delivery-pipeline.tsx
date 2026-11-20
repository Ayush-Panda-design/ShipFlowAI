import { CheckCircle2, ChevronRight, FileText, Kanban, Lightbulb, Rocket, ScanSearch } from "lucide-react";
import Link from "next/link";

import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import type { OverviewData } from "@/features/dashboard/server/overview-data";
import { cn } from "@/lib/utils";

/** Idea → Requirements → Tasks → Code review → Production, driven entirely by real workspace counts. */
export function DeliveryPipeline({ data }: { data: OverviewData }) {
  const stages = [
    { label: "Idea", icon: Lightbulb, value: data.featureRequestCount, unit: "feature requests", href: "feature-requests", tone: "bg-amber-soft text-warning" },
    { label: "Requirements", icon: FileText, value: data.prdCount, unit: "requirement docs", href: "prd", tone: "bg-brand-soft text-brand" },
    { label: "Tasks", icon: Kanban, value: data.taskCount, unit: "tasks planned", href: "tasks", tone: "bg-info-soft text-info" },
    { label: "Code review", icon: ScanSearch, value: data.openPullRequests, unit: "open PRs", href: "pull-requests", tone: "bg-info-soft text-info" },
    { label: "Production", icon: Rocket, value: data.awaitingApprovalCount, unit: "awaiting release", href: "approvals", tone: "bg-success-soft text-success" },
  ];

  return (
    <section className="sf-panel p-5 sm:p-6" aria-labelledby="pipeline-heading">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="sf-eyebrow">Delivery pipeline</p>
          <h2 id="pipeline-heading" className="mt-1 text-lg font-semibold tracking-tight">
            From idea to production
          </h2>
        </div>
        <CheckCircle2 className="hidden size-5 text-success sm:block" aria-hidden />
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const active = stage.value > 0;
          return (
            <li key={stage.label} className="relative lg:px-2 first:lg:pl-0 last:lg:pr-0">
              {index > 0 ? (
                <ChevronRight
                  aria-hidden
                  className="absolute left-0 top-[1.55rem] hidden size-4 -translate-x-1/2 text-border lg:block"
                />
              ) : null}
              <Link
                href={`${DASHBOARD_BASE_PATH}/${stage.href}`}
                className="group flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-border hover:bg-surface-sunken/60 lg:flex-col lg:items-start lg:gap-2.5"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105",
                    active ? stage.tone : "bg-muted text-text-subtle",
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-muted-foreground">{stage.label}</span>
                  <span className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-display text-2xl leading-none tabular-nums">{stage.value}</span>
                    <span className="truncate text-xs text-muted-foreground">{stage.unit}</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
