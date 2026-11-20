import { OverviewContent } from "@/features/dashboard/components/overview-content";
import { getOverviewData } from "@/features/dashboard/server/overview-data";
import { getOnboardingState } from "@/features/dashboard/server/onboarding-state";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { requireSession } from "@/lib/auth-session";

export default async function DashboardOverviewPage() {
  const session = await requireSession("/dashboard");
  const workspace = await ensureWorkspaceAction();
  const [data, onboarding] = await Promise.all([
    getOverviewData(session.user.id, workspace.id),
    getOnboardingState(session.user.id, workspace.id),
  ]);
  return <OverviewContent
      data={data}
      onboarding={onboarding}
      userName={session.user.name ?? null}
    />;
}
