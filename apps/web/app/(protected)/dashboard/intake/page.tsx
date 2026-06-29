import Link from "next/link";

import { IntakePageClient } from "@/features/dashboard/components/intake-page-client";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { getActiveProjectForWorkspace } from "@/lib/active-project";
import { requireSession } from "@/lib/auth-session";
import { listProjects } from "@repo/services";

export default async function IntakePage() {
  await requireSession("/dashboard/intake");
  const workspace = await ensureWorkspaceAction();
  const [projects, activeProject] = await Promise.all([
    listProjects(workspace.id),
    getActiveProjectForWorkspace(workspace.id),
  ]);

  const project = activeProject ?? projects[0];
  if (!project) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Create a project first</EmptyTitle>
          <EmptyDescription>
            Customer intake needs a project to attach new requests to.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild>
          <Link href={`${DASHBOARD_BASE_PATH}/projects`}>Go to projects</Link>
        </Button>
      </Empty>
    );
  }

  return (
    <IntakePageClient projectId={project.id} projectName={project.name} />
  );
}
