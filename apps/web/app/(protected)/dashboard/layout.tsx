import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { OnboardingBanner } from "@/features/dashboard/components/onboarding-banner";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { requireSession } from "@/lib/auth-session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getOnboardingState } from "@/features/dashboard/server/onboarding-state";
import { listWorkspacesForUser } from "@repo/services";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession("/dashboard");
  const activeWorkspace = await ensureWorkspaceAction();
  const workspaces = await listWorkspacesForUser(session.user.id);
  const onboarding = await getOnboardingState(session.user.id, activeWorkspace.id);
  const showPlatformAdmin = await isPlatformAdmin(session.user.id);

  return (
    <DashboardShell
      user={session.user}
      workspaces={workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
      }))}
      activeWorkspaceId={activeWorkspace.id}
      showPlatformAdmin={showPlatformAdmin}
    >
      <OnboardingBanner state={onboarding} />
      {children}
    </DashboardShell>
  );
}
