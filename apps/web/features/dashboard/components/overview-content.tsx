import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { OverviewRecentReviews } from "@/features/dashboard/components/overview-recent-reviews";
import type { OverviewData } from "@/features/dashboard/server/overview-data";
import {
  githubAppStatusStyles,
} from "@/features/dashboard/lib/status-styles";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { cn } from "@/lib/utils";

export function OverviewContent({ data }: { data: OverviewData }) {
  const stats = [
    {
      title: "Connected repositories",
      value: String(data.connectedRepos),
      change: `${data.connectedRepos} / ${data.repoLimit} plan limit`,
    },
    {
      title: "Open pull requests",
      value: String(data.openPullRequests),
      change:
        data.openPullRequests === 0
          ? "No PRs awaiting review"
          : "Pending or in review",
    },
    {
      title: "Reviews this week",
      value: String(data.reviewsThisWeek),
      change: `${data.prdCount} PRDs · ${data.featureRequestCount} features`,
    },
    {
      title: "Awaiting release",
      value: String(data.awaitingApprovalCount),
      change: data.githubApp.detail,
      status: data.githubApp.status,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          ShipFlow delivery pipeline at a glance
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
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
                    "mb-2 font-medium",
                    githubAppStatusStyles[stat.status].badgeClassName,
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
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Recent reviews</CardTitle>
            <CardDescription>
              Latest AI reviews across your connected repositories
            </CardDescription>
          </div>
          <Link
            href={`${DASHBOARD_BASE_PATH}/review-history`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <OverviewRecentReviews reviews={data.recentReviews} />
        </CardContent>
      </Card>
    </div>
  );
}
