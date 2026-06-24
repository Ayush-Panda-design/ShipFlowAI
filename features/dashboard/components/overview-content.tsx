import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  githubAppStatusStyles,
  statusStyles,
  type ReviewStatus,
} from "@/features/dashboard/lib/status-styles";
import { cn } from "@/lib/utils";

const overviewStats = [
  {
    title: "Connected repositories",
    value: "12",
    change: "+2 this month",
  },
  {
    title: "Open pull requests",
    value: "8",
    change: "3 awaiting review",
  },
  {
    title: "Reviews this week",
    value: "24",
    change: "+18% vs last week",
  },
  {
    title: "GitHub App",
    value: githubAppStatusStyles.connected.label,
    change: "Installed on Ayush-Panda-design org",
    status: "connected" as const,
  },
];

const recentReviews: Array<{
  id: string;
  repository: string;
  pullRequest: string;
  status: ReviewStatus;
  updatedAt: string;
}> = [
  {
    id: "1",
    repository: "AI-powered-Code-review",
    pullRequest: "Add dashboard shell and sidebar",
    status: "in_progress",
    updatedAt: "12 min ago",
  },
  {
    id: "2",
    repository: "AI-powered-Code-review",
    pullRequest: "Configure Better Auth with Neon",
    status: "approved",
    updatedAt: "2 hours ago",
  },
  {
    id: "3",
    repository: "portfolio-site",
    pullRequest: "Fix mobile navigation overlap",
    status: "changes_requested",
    updatedAt: "Yesterday",
  },
  {
    id: "4",
    repository: "api-gateway",
    pullRequest: "Upgrade Prisma to v7",
    status: "pending",
    updatedAt: "2 days ago",
  },
];

function StatusBadge({ status }: { status: ReviewStatus }) {
  const style = statusStyles[status];

  return (
    <Badge variant="outline" className={cn("font-medium", style.badgeClassName)}>
      {style.label}
    </Badge>
  );
}

export function OverviewContent() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((stat) => (
          <Card key={stat.title} size="sm">
            <CardHeader>
              <CardDescription>{stat.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stat.status ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    githubAppStatusStyles[stat.status].badgeClassName
                  )}
                >
                  {githubAppStatusStyles[stat.status].label}
                </Badge>
              ) : null}
              <p className="text-sm text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent reviews</CardTitle>
          <CardDescription>
            Mock activity feed for connected repositories and pull requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentReviews.map((review) => (
            <div
              key={review.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <p className="font-medium">{review.pullRequest}</p>
                <p className="text-sm text-muted-foreground">
                  {review.repository} · {review.updatedAt}
                </p>
              </div>
              <StatusBadge status={review.status} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
