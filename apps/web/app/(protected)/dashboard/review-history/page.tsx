import { ReviewHistoryTableClient } from "@/features/dashboard/components/review-history-table-client";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { requireSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function ReviewHistoryPage() {
  await requireSession("/dashboard/review-history");
  await ensureWorkspaceAction();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Review History</h1>
        <p className="text-sm text-muted-foreground">
          AI review results across all pull requests
        </p>
      </div>

      <SectionGuideCard section="review-history" />

      <ReviewHistoryTableClient />
    </div>
  );
}
