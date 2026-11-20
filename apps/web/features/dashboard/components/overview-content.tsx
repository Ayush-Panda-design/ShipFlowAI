import Link from "next/link";

import { OnboardingGuide } from "@/features/dashboard/components/onboarding-guide";

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
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import type { OverviewData } from "@/features/dashboard/server/overview-data";
import type { OnboardingState } from "@/features/dashboard/server/onboarding-state";
import {
  githubAppStatusStyles,
} from "@/features/dashboard/lib/status-styles";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { cn } from "@/lib/utils";

export function OverviewContent({
  data,
  onboarding,
}: {
  data: OverviewData;
  onboarding: OnboardingState;
}) {
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
      change: `${data.prdCount} requirement docs · ${data.featureRequestCount} features`,
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
      <div className="hero-light relative overflow-hidden rounded-2xl border border-border/60 px-6 py-7 shadow-[var(--shadow-soft)] md:px-8">
        <div className="pointer-events-none absolute -right-10 -top-16 size-64 rounded-full bg-primary/10 blur-3xl" />
        <h1 className="relative text-3xl font-bold tracking-tight md:text-4xl">
          Overview
        </h1>
        <p className="relative mt-1.5 text-sm text-muted-foreground md:text-base">
          ShipFlow delivery pipeline at a glance
        </p>
      </div>

      <SectionGuideCard section="overview" />

      <OnboardingGuide state={onboarding} variant="full" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} size="sm" className="border-t-2 border-t-primary/60 dark:border-t-0">
            <CardHeader>
              <CardDescription>{stat.title}</CardDescription>
              <CardTitle className="text-3xl font-bold tracking-tight text-primary dark:text-foreground">
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
