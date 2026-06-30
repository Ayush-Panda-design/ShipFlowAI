import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReposConnectPanel } from "@/features/dashboard/components/repos-connect-panel";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { getInstallationForUser } from "@/features/github/server/installation";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { listConnectedRepositoriesForWorkspace } from "@repo/services";

async function getOrCreateDefaultProject(workspaceId: string) {
  const existing = await prisma.project.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.project.create({
    data: {
      workspaceId,
      name: "Default Project",
      description: "Main product delivery pipeline",
    },
  });
}

export default async function RepositoriesPage() {
  const session = await requireSession("/dashboard/repositories");
  const workspace = await ensureWorkspaceAction();
  const installation = await getInstallationForUser(session.user.id);
  const project = await getOrCreateDefaultProject(workspace.id);
  const connectedRepos = await listConnectedRepositoriesForWorkspace(workspace.id);

  if (!installation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
          <CardDescription>
            Install the GitHub App to list repositories your account has granted
            access to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`${DASHBOARD_BASE_PATH}/github-app`}
            className={buttonVariants()}
          >
            Connect GitHub App
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Repositories</h2>
        <p className="text-sm text-muted-foreground">
          Connect repos to your project for ShipFlow tracking (@
          {installation.accountLogin})
        </p>
      </div>
      <SectionGuideCard section="repositories" />
      <ReposConnectPanel
        projectId={project.id}
        installationId={installation.installationId}
        connectedRepos={connectedRepos.map((repo) => ({
          repoFullName: repo.repoFullName,
          projectId: repo.projectId,
        }))}
        repoLimit={workspace.repoLimit}
      />
    </div>
  );
}
