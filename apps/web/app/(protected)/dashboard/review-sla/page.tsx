"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/trpc/client";
import { LoadingState } from "@/components/ui/loading-state";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";

export default function ReviewSlaPage() {
  const { data, isLoading } = trpc.review.reviewSlaMetrics.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Review SLA dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Time-to-first-review by repository — spot bottlenecks before they stall
          shipping.
        </p>
      </div>

      <SectionGuideCard section="review-sla" />

      {isLoading ? (
        <LoadingState
          label="Loading review metrics"
          description="Calculating time-to-first-review across repositories."
          variant="metrics"
          className="py-8"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repository</TableHead>
              <TableHead>PRs tracked</TableHead>
              <TableHead>Avg hours to first review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.metrics ?? []).map((metric) => (
              <TableRow key={metric.repo}>
                <TableCell className="font-medium">{metric.repo}</TableCell>
                <TableCell>{metric.prCount}</TableCell>
                <TableCell>
                  {metric.avgHoursToFirstReview != null
                    ? `${metric.avgHoursToFirstReview}h`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {(data?.metrics ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No PR data yet — connect GitHub and run reviews.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
