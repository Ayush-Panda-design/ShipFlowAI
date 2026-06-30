"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { trpc } from "@/trpc/client";

export default function ActivityPage() {
  const { data: workspaces = [] } = trpc.workspace.list.useQuery();
  const workspaceId = workspaces[0]?.id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Activity feed</h2>
        <p className="text-sm text-muted-foreground">
          Org-wide audit trail — reviews, approvals, and stale PR nudges.
        </p>
      </div>

      <SectionGuideCard section="activity" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent events</CardTitle>
        </CardHeader>
        <CardContent>
          {workspaceId ? (
            <ActivityFeed workspaceId={workspaceId} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a workspace to see activity.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
