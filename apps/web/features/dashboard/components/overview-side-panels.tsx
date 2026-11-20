import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { IllustratedEmptyState } from "@/components/illustrations/empty-state";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { statusStyles } from "@/features/dashboard/lib/status-styles";
import type { OverviewData } from "@/features/dashboard/server/overview-data";
import { cn } from "@/lib/utils";

/** Outcome mix across the latest reviews + repository capacity — all from live data. */
export function ReviewHealthPanel({ data }: { data: OverviewData }) {
  const reviews = data.recentReviews;
  const approved = reviews.filter((r) => r.status === "approved").length;
  const blocking = reviews.filter((r) => r.blockingCount > 0).length;
  const other = reviews.length - approved - blocking;
  const total = reviews.length;
  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  const approvalRate = total === 0 ? null : Math.round(pct(approved));
  const capacity = Math.min(100, (data.connectedRepos / Math.max(1, data.repoLimit)) * 100);

  return (
    <section className="sf-panel p-5" aria-labelledby="health-heading">
      <p className="sf-eyebrow">Health</p>
      <h2 id="health-heading" className="mt-1 text-lg font-semibold tracking-tight">
        Review outcomes
      </h2>

      {total === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Outcomes will show up once your first review completes.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-4xl leading-none tabular-nums">{approvalRate}%</span>
            <span className="text-xs text-muted-foreground">approved · last {total} reviews</span>
          </div>
          <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label="Review outcome distribution">
            <span className="sf-grow h-full bg-success" style={{ width: `${pct(approved)}%` }} />
            <span className="sf-grow h-full bg-danger" style={{ width: `${pct(blocking)}%` }} />
            <span className="sf-grow h-full bg-amber" style={{ width: `${pct(other)}%` }} />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {[
              ["Approved", approved, "bg-success"],
              ["Blocking", blocking, "bg-danger"],
              ["Other", other, "bg-amber"],
            ].map(([label, count, dot]) => (
              <div key={label as string} className="rounded-lg bg-surface-sunken/70 px-2.5 py-2">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={cn("size-1.5 rounded-full", dot as string)} />
                  {label}
                </dt>
                <dd className="mt-0.5 text-base font-semibold tabular-nums">{count}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      <div className="mt-5 border-t border-border/70 pt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80">Repository capacity</span>
          <span className="tabular-nums text-muted-foreground">
            {data.connectedRepos} / {data.repoLimit}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="sf-grow h-full rounded-full bg-brand" style={{ width: `${capacity}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{data.githubApp.detail}</p>
      </div>
    </section>
  );
}

/** Timeline of the latest review events. */
export function ActivityTimeline({ data }: { data: OverviewData }) {
  const items = data.recentReviews.slice(0, 5);

  return (
    <section className="sf-panel p-5" aria-labelledby="timeline-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="sf-eyebrow">Activity</p>
          <h2 id="timeline-heading" className="mt-1 text-lg font-semibold tracking-tight">
            Recent activity
          </h2>
        </div>
        <Link
          href={`${DASHBOARD_BASE_PATH}/activity`}
          className="text-xs font-medium text-brand transition-colors hover:text-brand-strong"
        >
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <IllustratedEmptyState
          kind="pull-requests"
          size="compact"
          title="Nothing yet"
          description="Review events appear here as your team ships."
        />
      ) : (
        <ol className="relative mt-5 space-y-5 before:absolute before:bottom-1 before:left-[5px] before:top-1 before:w-px before:bg-border">
          {items.map((item) => (
            <li key={item.id} className="relative pl-6">
              <span
                className={cn(
                  "absolute left-0 top-1 size-[11px] rounded-full border-2 border-card ring-1 ring-border",
                  statusStyles[item.status].dotClassName,
                )}
              />
              <p className="text-sm leading-snug">
                <span className="font-medium">PR #{item.prNumber}</span>{" "}
                <span className="text-muted-foreground">
                  {item.blockingCount > 0
                    ? `flagged ${item.blockingCount} blocking issue${item.blockingCount > 1 ? "s" : ""}`
                    : "reviewed by AI"}
                </span>
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.pullRequest}</p>
              <p className="mt-0.5 text-[11px] text-text-subtle">
                {formatDistanceToNow(item.updatedAt, { addSuffix: true })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/** Shown when nothing is awaiting release. */
export function ReleaseReadyPanel({ data }: { data: OverviewData }) {
  if (data.awaitingApprovalCount > 0) return null;
  return (
    <section className="sf-panel">
      <IllustratedEmptyState
        kind="release"
        size="compact"
        title="No pending releases"
        description="When a feature clears review it lands here, ready for your approval."
      />
    </section>
  );
}
