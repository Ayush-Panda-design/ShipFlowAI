import { ApprovalsPageClient } from "@/features/dashboard/components/approvals-page-client";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const workspace = await ensureWorkspaceAction();

  const features = await prisma.featureRequest.findMany({
    where: {
      project: { workspaceId: workspace.id },
      status: {
        in: ["awaiting_approval", "fix_needed", "release_checking"],
      },
    },
    include: {
      approvals: {
        orderBy: { createdAt: "desc" },
        include: { reviewer: { select: { name: true, email: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Release Approval</h1>
        <p className="text-sm text-muted-foreground">
          Human gate for features ready to ship
        </p>
      </div>

      <SectionGuideCard section="approvals" />

      <ApprovalsPageClient
        features={features.map((feature) => ({
          id: feature.id,
          title: feature.title,
          status: feature.status,
          approvals: feature.approvals.map((approval) => ({
            ...approval,
            createdAt: new Date(approval.createdAt),
          })),
        }))}
      />
    </div>
  );
}
