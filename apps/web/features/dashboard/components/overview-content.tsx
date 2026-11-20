import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DeliveryPipeline } from "@/features/dashboard/components/delivery-pipeline";
import { JourneyRail } from "@/features/dashboard/components/journey-rail";
import type { GettingStartedJourney } from "@/features/dashboard/lib/getting-started-journey";
import { OverviewHero } from "@/features/dashboard/components/overview-hero";
import { OverviewMetrics } from "@/features/dashboard/components/overview-metrics";
import { OverviewRecentReviews } from "@/features/dashboard/components/overview-recent-reviews";
import {
  ActivityTimeline,
  ReleaseReadyPanel,
  ReviewHealthPanel,
} from "@/features/dashboard/components/overview-side-panels";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import type { OverviewData } from "@/features/dashboard/server/overview-data";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";

export function OverviewContent({
  data,
  userName,
  journey,
}: {
  data: OverviewData;
  userName?: string | null;
  journey: GettingStartedJourney;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 lg:gap-6">
      <OverviewHero userName={userName} />

      <JourneyRail journey={journey} />

      <OverviewMetrics data={data} />

      <DeliveryPipeline data={data} />

      <div className="grid gap-5 lg:gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          <section className="sf-panel p-5 sm:p-6" aria-labelledby="reviews-heading">
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="sf-eyebrow">Code &amp; review</p>
                <h2 id="reviews-heading" className="mt-1 text-lg font-semibold tracking-tight">
                  Recent reviews
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Latest AI reviews across your connected repositories
                </p>
              </div>
              <Link
                href={`${DASHBOARD_BASE_PATH}/review-history`}
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium shadow-soft transition-all hover:border-brand/40 hover:text-brand active:translate-y-px"
              >
                View all
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <OverviewRecentReviews reviews={data.recentReviews} />
          </section>

          <ActivityTimeline data={data} />
        </div>

        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          <ReviewHealthPanel data={data} />
          <ReleaseReadyPanel data={data} />
        </div>
      </div>

      <SectionGuideCard section="overview" />
    </div>
  );
}
