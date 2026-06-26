import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeatureStatusBadge } from "@/features/shipflow/components/feature-status-badge";
import {
  triggerClarificationAction,
  triggerPrdGenerationAction,
  triggerTaskGenerationAction,
} from "@/lib/actions/shipflow";
import { getFeatureRequest } from "@repo/services";

import { AiReviewPanel } from "@/features/reviews/components/ai-review-panel";
import {
  ApprovalHistory,
  ReleaseApprovalPanel,
} from "@/features/shipflow/components/release-approval-panel";
import { WorkflowStatusCard } from "@/features/shipflow/components/workflow-status-card";

export default async function FeatureRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const feature = await getFeatureRequest(id);
  if (!feature) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/feature-requests" className="text-sm text-muted-foreground hover:underline">
            ← Feature requests
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{feature.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <FeatureStatusBadge status={feature.status} />
            <span className="text-xs text-muted-foreground">Source: {feature.source}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <form
            action={async () => {
              "use server";
              await triggerClarificationAction(id);
            }}
          >
            <Button type="submit" variant="outline" size="sm">AI clarify</Button>
          </form>
          <form
            action={async () => {
              "use server";
              await triggerPrdGenerationAction(id);
            }}
          >
            <Button type="submit" variant="outline" size="sm">Generate PRD</Button>
          </form>
          <form
            action={async () => {
              "use server";
              await triggerTaskGenerationAction(id);
            }}
          >
            <Button type="submit" variant="outline" size="sm">Generate tasks</Button>
          </form>
        </div>
      </div>

      <WorkflowStatusCard status={feature.status} />

      <Card>
        <CardHeader><CardTitle className="text-base">Request</CardTitle></CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm">{feature.description}</CardContent>
      </Card>

      {feature.clarifications.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Clarifications</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {feature.clarifications.map((msg) => (
              <div key={msg.id} className="rounded-lg border p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{msg.role}</p>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {feature.prd && (
        <Card>
          <CardHeader><CardTitle className="text-base">PRD</CardTitle></CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm">{feature.prd.rawMarkdown}</pre>
          </CardContent>
        </Card>
      )}

      {feature.tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engineering tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {feature.tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>{task.title}</span>
                <span className="text-xs text-muted-foreground">{task.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {feature.pullRequests.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Linked pull requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {feature.pullRequests.map((pr) => (
              <div key={pr.id} className="flex justify-between text-sm">
                <span>{pr.repoFullName} #{pr.prNumber} — {pr.title}</span>
                <span className="capitalize">{pr.status}</span>
              </div>
            ))}
            <p className="pt-2 text-xs text-muted-foreground">
              Link PRs automatically with branch names like{" "}
              <code>feature/&lt;feature-id&gt;</code> or PR title{" "}
              <code>[shipflow:&lt;feature-id&gt;]</code>.
            </p>
          </CardContent>
        </Card>
      )}

      <AiReviewPanel reviews={feature.aiReviews} />

      <ReleaseApprovalPanel
        featureRequestId={id}
        status={feature.status}
      />

      <ApprovalHistory approvals={feature.approvals} />
    </div>
  );
}
