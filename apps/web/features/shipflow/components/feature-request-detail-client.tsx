"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiReviewPanel } from "@/features/reviews/components/ai-review-panel";
import { FeatureStatusBadge } from "@/features/shipflow/components/feature-status-badge";
import {
  ApprovalHistory,
  ReleaseApprovalPanel,
} from "@/features/shipflow/components/release-approval-panel";
import { WorkflowStatusCard } from "@/features/shipflow/components/workflow-status-card";
import { AI_CREDIT_COSTS, isInFlightFeatureStatus } from "@repo/services/constants";
import { trpc } from "@/trpc/client";

type FeatureRequestDetailClientProps = {
  featureId: string;
};

export function FeatureRequestDetailClient({
  featureId,
}: FeatureRequestDetailClientProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data: feature, isLoading, error } = trpc.featureRequest.get.useQuery(
    { id: featureId },
    {
      refetchInterval: (query) =>
        query.state.data && isInFlightFeatureStatus(query.state.data.status)
          ? 3000
          : false,
    },
  );

  const workspaceId = feature?.project.workspaceId;
  const { data: workspace } = trpc.workspace.get.useQuery(
    { workspaceId: workspaceId ?? "" },
    { enabled: Boolean(workspaceId) },
  );

  const invalidate = async () => {
    await utils.featureRequest.get.invalidate({ id: featureId });
    if (workspaceId) {
      await utils.workspace.get.invalidate({ workspaceId });
    }
    router.refresh();
  };

  const clarifyMutation = trpc.shipflow.triggerClarify.useMutation({
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });
  const prdMutation = trpc.shipflow.triggerPrd.useMutation({
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });
  const tasksMutation = trpc.shipflow.triggerTasks.useMutation({
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message),
  });

  const credits = workspace?.aiCredits ?? 0;
  const inFlight = feature ? isInFlightFeatureStatus(feature.status) : false;

  const creditHint = (cost: number) => {
    if (inFlight) {
      return "Wait for the current AI job to finish.";
    }
    if (credits < cost) {
      return `Need ${cost} AI credits (you have ${credits}). Open Billing to upgrade.`;
    }
    return undefined;
  };

  const canAfford = (cost: number) => !inFlight && credits >= cost;

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading feature…</p>;
  }

  if (error || !feature) {
    return (
      <p className="text-sm text-destructive">
        {error?.message ?? "Feature not found"}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/feature-requests"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Feature requests
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{feature.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <FeatureStatusBadge status={feature.status} />
            <span className="text-xs text-muted-foreground">
              Source: {feature.source}
            </span>
            {workspace ? (
              <span className="text-xs text-muted-foreground">
                · {workspace.aiCredits} AI credits left
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canAfford(AI_CREDIT_COSTS.clarify) || clarifyMutation.isPending}
            title={creditHint(AI_CREDIT_COSTS.clarify)}
            onClick={() => clarifyMutation.mutate({ featureRequestId: featureId })}
          >
            AI clarify ({AI_CREDIT_COSTS.clarify} cr)
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canAfford(AI_CREDIT_COSTS.prd) || prdMutation.isPending}
            title={creditHint(AI_CREDIT_COSTS.prd)}
            onClick={() => prdMutation.mutate({ featureRequestId: featureId })}
          >
            Generate PRD ({AI_CREDIT_COSTS.prd} cr)
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canAfford(AI_CREDIT_COSTS.tasks) || tasksMutation.isPending}
            title={creditHint(AI_CREDIT_COSTS.tasks)}
            onClick={() => tasksMutation.mutate({ featureRequestId: featureId })}
          >
            Generate tasks ({AI_CREDIT_COSTS.tasks} cr)
          </Button>
        </div>
      </div>

      {credits < AI_CREDIT_COSTS.review ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            You need at least {AI_CREDIT_COSTS.review} AI credits to run a review
            (you have {credits}).{" "}
            <Link href="/dashboard/billing" className="underline">
              Upgrade on Billing
            </Link>{" "}
            to continue running AI jobs.
          </CardContent>
        </Card>
      ) : null}

      <WorkflowStatusCard status={feature.status} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request</CardTitle>
        </CardHeader>
        <CardContent className="whitespace-pre-wrap text-sm">
          {feature.description}
        </CardContent>
      </Card>

      {feature.clarifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clarifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {feature.clarifications.map((msg) => (
              <div key={msg.id} className="rounded-lg border p-3 text-sm">
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                  {msg.role}
                </p>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {feature.prd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PRD</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-sm">
              {feature.prd.rawMarkdown}
            </pre>
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
              <div
                key={task.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span>{task.title}</span>
                <span className="text-xs text-muted-foreground">{task.status}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {feature.pullRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked pull requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {feature.pullRequests.map((pr) => (
              <div key={pr.id} className="flex justify-between text-sm">
                <span>
                  {pr.repoFullName} #{pr.prNumber} — {pr.title}
                </span>
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

      <AiReviewPanel
        reviews={feature.aiReviews.map((review) => ({
          ...review,
          createdAt: new Date(review.createdAt),
        }))}
      />

      <ReleaseApprovalPanel
        featureRequestId={featureId}
        status={feature.status}
        onUpdated={invalidate}
      />

      <ApprovalHistory
        approvals={feature.approvals.map((approval) => ({
          ...approval,
          createdAt: new Date(approval.createdAt),
        }))}
      />
    </div>
  );
}
