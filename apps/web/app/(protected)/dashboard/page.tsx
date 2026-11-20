import { OverviewContent } from "@/features/dashboard/components/overview-content";
import { getOverviewData } from "@/features/dashboard/server/overview-data";
import { getJourneySignals } from "@/features/dashboard/server/journey-signals";
import { getGettingStartedJourney } from "@/features/dashboard/lib/getting-started-journey";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { requireSession } from "@/lib/auth-session";

export default async function DashboardOverviewPage() {
  const session = await requireSession("/dashboard");
  const workspace = await ensureWorkspaceAction();
  const [data, signals] = await Promise.all([
    getOverviewData(session.user.id, workspace.id),
    getJourneySignals(session.user.id, workspace.id),
  ]);
  return (
    <OverviewContent
      data={data}
      userName={session.user.name ?? null}
      journey={getGettingStartedJourney(signals)}
    />
  );
}
