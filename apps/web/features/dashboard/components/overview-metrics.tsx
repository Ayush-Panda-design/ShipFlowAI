import {
  ArrowUpRight,
  FolderGit2,
  GitPullRequest,
  Rocket,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { githubAppStatusStyles } from "@/features/dashboard/lib/status-styles";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import type { OverviewData } from "@/features/dashboard/server/overview-data";
import { cn } from "@/lib/utils";

function MetricShell({
  href,
  label,
  icon,
  iconClassName,
  value,
  caption,
  children,
  className,
  delay,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  iconClassName: string;
  value: number;
  caption: ReactNode;
  children?: ReactNode;
  className?: string;
  delay: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "sf-panel sf-rise group relative flex min-h-[10.5rem] flex-col justify-between gap-4 overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        delay,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("grid size-9 place-items-center rounded-xl", iconClassName)}>
            {icon}
          </span>
          <span className="text-sm font-medium text-foreground/80">{label}</span>
        </div>
        <ArrowUpRight className="size-4 text-text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="font-display text-[2.75rem] leading-none tabular-nums text-foreground">
            {value}
          </div>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">{caption}</p>
        </div>
        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </Link>
  );
}

/** Real per-day review counts (trailing 7 days) as an animated line. */
function ReviewsSparkline({ points }: { points: { count: number }[] }) {
  const w = 108;
  const h = 44;
  const max = Math.max(1, ...points.map((p) => p.count));
  const step = (w - 8) / Math.max(1, points.length - 1);
  const coords = points.map((p, i) => [4 + i * step, h - 6 - (p.count / max) * (h - 14)] as const);
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w - 4} ${h} L4 ${h} Z`;
  const last = coords[coords.length - 1]!;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-11 w-[6.75rem]" role="img" aria-label="Reviews per day, last 7 days">
      <defs>
        <linearGradient id="sf-spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--success)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sf-spark)" />
      <path
        d={line}
        fill="none"
        stroke="var(--success)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sf-draw"
        style={{ ["--len" as string]: 260 }}
      />
      <circle cx={last[0]} cy={last[1]} r="3.2" fill="var(--card)" stroke="var(--success)" strokeWidth="2" />
    </svg>
  );
}

/** Plan capacity as a ring: connected repositories out of the plan limit. */
function CapacityRing({ filled, total }: { filled: number; total: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, filled / Math.max(1, total));
  return (
    <svg viewBox="0 0 56 56" className="size-14 -rotate-90" role="img" aria-label={`${filled} of ${total} repositories`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        className="transition-[stroke-dashoffset] duration-700"
      />
    </svg>
  );
}

export function OverviewMetrics({ data }: { data: OverviewData }) {
  const limit = Math.max(1, data.repoLimit);
  const appStatus = githubAppStatusStyles[data.githubApp.status];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricShell
        href={`${DASHBOARD_BASE_PATH}/repositories`}
        label="Connected repositories"
        icon={<FolderGit2 className="size-[18px]" />}
        iconClassName="bg-brand-soft text-brand"
        value={data.connectedRepos}
        caption={`${data.connectedRepos} of ${data.repoLimit} on your plan`}
        delay="sf-delay-1"
      >
        <CapacityRing filled={data.connectedRepos} total={limit} />
      </MetricShell>

      <MetricShell
        href={`${DASHBOARD_BASE_PATH}/pull-requests`}
        label="Open pull requests"
        icon={<GitPullRequest className="size-[18px]" />}
        iconClassName="bg-info-soft text-info"
        value={data.openPullRequests}
        caption={data.openPullRequests === 0 ? "No PRs awaiting review" : "Pending or in review"}
        delay="sf-delay-2"
      >
        <svg viewBox="0 0 56 56" className="size-14" aria-hidden>
          <path d="M16 6 V50" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M16 38 C16 24 40 30 40 14" stroke="var(--info)" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeDasharray="1 5" />
          <circle cx="16" cy="10" r="4.5" fill="var(--card)" stroke="var(--text-subtle)" strokeWidth="2" />
          <circle cx="16" cy="46" r="4.5" fill="var(--card)" stroke="var(--text-subtle)" strokeWidth="2" />
          <circle cx="40" cy="12" r="5" fill="var(--info)" />
        </svg>
      </MetricShell>

      <MetricShell
        href={`${DASHBOARD_BASE_PATH}/review-history`}
        label="Reviews this week"
        icon={<Sparkles className="size-[18px]" />}
        iconClassName="bg-success-soft text-success"
        value={data.reviewsThisWeek}
        caption="Last 7 days"
        delay="sf-delay-3"
      >
        <ReviewsSparkline points={data.reviewsByDay} />
      </MetricShell>

      <MetricShell
        href={`${DASHBOARD_BASE_PATH}/approvals`}
        label="Awaiting release"
        icon={<Rocket className="size-[18px]" />}
        iconClassName="bg-amber-soft text-warning"
        value={data.awaitingApprovalCount}
        caption={
          <Badge variant="outline" className={cn("font-medium", appStatus.badgeClassName)}>
            GitHub · {appStatus.label}
          </Badge>
        }
        delay="sf-delay-4"
      />
    </div>
  );
}
