import { revalidatePath } from "next/cache";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceSwitcher } from "@/features/dashboard/components/workspace-switcher";
import { WorkspaceMembersPanel } from "@/features/dashboard/components/workspace-members-panel";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { ensureWorkspaceAction, setActiveWorkspaceAction } from "@/lib/actions/shipflow";
import { requireSession } from "@/lib/auth-session";
import { createWorkspace, listWorkspacesForUser } from "@repo/services";

export default async function WorkspacesPage() {
  const session = await requireSession("/dashboard/workspaces");
  const activeWorkspace = await ensureWorkspaceAction();
  const workspaces = await listWorkspacesForUser(session.user.id);

  async function createWorkspaceAction(formData: FormData) {
    "use server";
    const session = await requireSession();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return;

    const workspace = await createWorkspace(session.user.id, name);
    await setActiveWorkspaceAction(workspace.id);
    revalidatePath("/dashboard/workspaces");
    revalidatePath("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Workspaces</h1>
        <p className="text-sm text-muted-foreground">
          Multi-tenant workspaces with separate billing and delivery pipelines
        </p>
      </div>

      <SectionGuideCard section="workspaces" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkspaceSwitcher
            workspaces={workspaces.map((workspace) => ({
              id: workspace.id,
              name: workspace.name,
            }))}
            activeWorkspaceId={activeWorkspace.id}
          />
        </CardContent>
      </Card>

      <WorkspaceMembersPanel workspaceId={activeWorkspace.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All workspaces</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {workspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="flex items-center justify-between rounded border px-3 py-2 text-sm"
            >
              <span>{workspace.name}</span>
              <span className="text-xs text-muted-foreground">
                {workspace.plan} · {workspace.aiCredits} credits
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createWorkspaceAction} className="flex gap-2">
            <input
              name="name"
              placeholder="Workspace name"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
            <Button type="submit">Create</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
