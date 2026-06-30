import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { FeatureStatusBadge } from "@/features/shipflow/components/feature-status-badge";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { prisma } from "@/lib/db";

export default async function PrdListPage() {
  const workspace = await ensureWorkspaceAction();
  const prds = await prisma.pRD.findMany({
    where: { featureRequest: { project: { workspaceId: workspace.id } } },
    include: {
      featureRequest: { select: { id: true, title: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">PRD Editor</h1>
        <p className="text-sm text-muted-foreground">
          View and edit product requirement documents generated from feature requests
        </p>
      </div>

      <SectionGuideCard section="prd" />

      {prds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No PRDs yet. Create a feature request and run Generate PRD.
        </p>
      ) : (
        <div className="grid gap-3">
          {prds.map((prd) => (
            <Link key={prd.id} href={`/dashboard/prd/${prd.featureRequest.id}`}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardHeader className="flex flex-row items-center justify-between gap-4 py-4">
                  <CardTitle className="text-base">
                    {prd.featureRequest.title}
                  </CardTitle>
                  <FeatureStatusBadge status={prd.featureRequest.status} />
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {prd.rawMarkdown}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
