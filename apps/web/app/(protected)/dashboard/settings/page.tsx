import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { getInstallationForUser } from "@/features/github/server/installation";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { requireSession } from "@/lib/auth-session";
import { isGitHubAppConfigured } from "@/features/github/utils/github-app";

export default async function SettingsPage() {
  const session = await requireSession("/dashboard/settings");
  const workspace = await ensureWorkspaceAction();
  const installation = await getInstallationForUser(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Account, workspace, and integration preferences
        </p>
      </div>

      <SectionGuideCard section="settings" />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed-in user details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span>{" "}
            {session.user.name ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span>{" "}
            {session.user.email}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
          <CardDescription>Active workspace for ShipFlow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Name:</span> {workspace.name}
          </p>
          <p>
            <span className="text-muted-foreground">Plan:</span> {workspace.plan}
          </p>
          <p>
            <span className="text-muted-foreground">AI credits:</span>{" "}
            {workspace.aiCredits}
          </p>
          <Link href={`${DASHBOARD_BASE_PATH}/workspaces`} className="text-sm underline">
            Manage workspaces
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GitHub integration</CardTitle>
          <CardDescription>App installation status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">App configured:</span>{" "}
            {isGitHubAppConfigured() ? "Yes" : "No"}
          </p>
          <p>
            <span className="text-muted-foreground">Installation:</span>{" "}
            {installation
              ? `Connected (@${installation.accountLogin})`
              : "Not connected"}
          </p>
          <Link href={`${DASHBOARD_BASE_PATH}/github-app`} className="text-sm underline">
            GitHub App settings
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
