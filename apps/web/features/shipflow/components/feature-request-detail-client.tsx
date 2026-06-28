"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  rememberLastFeature,
  isTerminalFeatureStatus,
  clearLastFeature,
} from "@/features/shipflow/lib/last-feature";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AiReviewPanel } from "@/features/reviews/components/ai-review-panel";
import { FeatureStatusBadge } from "@/features/shipflow/components/feature-status-badge";
import { PrLinkPanel } from "@/features/shipflow/components/pr-link-panel";
import {
  ApprovalHistory,
  ReleaseApprovalPanel,
} from "@/features/shipflow/components/release-approval-panel";
import { PrdDiffPanel } from "@/features/shipflow/components/prd-diff-panel";
import { WorkflowStepper } from "@/features/shipflow/components/workflow-stepper";
import { LoadingState } from "@/components/ui/loading-state";
import { ButtonLoadingLabel, LoadingIllustration } from "@/components/ui/loading-illustration";
import {
  aiJobToastId,
  getCreditAffordance,
  getLowCreditsBannerMessage,
} from "@/features/shipflow/lib/credit-hints";
import { BILLING_PATH } from "@/features/dashboard/lib/routes";
import { approvePlanAction, approvePrdAction } from "@/lib/actions/shipflow";
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
      refetchOnWindowFocus: true,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return false;
        // Terminal states never change — stop polling.
        if (
          data.status === "shipped" ||
          data.status === "rejected" ||
          data.status === "duplicate"
        ) {
          return false;
        }
        // AI jobs or in-flight PRs update fast.
        if (isInFlightFeatureStatus(data.status)) return 3000;
        const prInFlight = data.pullRequests?.some(
          (pr) => pr.status === "pending" || pr.status === "processing",
        );
        if (prInFlight) return 3000;
        // Otherwise keep the page live (PR links, reviews, status) at a
        // gentler cadence so no manual refresh is ever needed.
        return 5000;
      },
    },
  );

  const workspaceId = feature?.project.workspaceId;
  const inFlight = feature ? isInFlightFeatureStatus(feature.status) : false;

  useEffect(() => {
    if (!feature) return;
    if (isTerminalFeatureStatus(feature.status)) {
      clearLastFeature();
      return;
    }
    rememberLastFeature({
      id: feature.id,
      title: feature.title,
      status: feature.status,
      projectId: feature.projectId,
    });
  }, [feature]);

  const { data: workspace } = trpc.workspace.get.useQuery(
    { workspaceId: workspaceId ?? "" },
    {
      enabled: Boolean(workspaceId),
      refetchInterval: inFlight ? 3000 : false,
    },
  );

  const credits = workspace?.aiCredits ?? 0;
  const billingHref = BILLING_PATH;

  const invalidate = async () => {
    await utils.featureRequest.get.invalidate({ id: featureId });
    if (workspaceId) {
      await utils.workspace.get.invalidate({ workspaceId });
    }
    router.refresh();
  };

  const aiMutationHandlers = (action: string, cost: number) => ({
    onMutate: () => {
      toast.loading(`${action}… (${cost} credit${cost === 1 ? "" : "s"})`, {
        id: aiJobToastId(featureId, action),
      });
    },
    onSuccess: async () => {
      toast.success(
        `${action} started — ${cost} credit${cost === 1 ? "" : "s"} will be used`,
        { id: aiJobToastId(featureId, action) },
      );
      await invalidate();
    },
    onError: (err: { message: string }) => {
      toast.error(err.message, { id: aiJobToastId(featureId, action) });
    },
  });

  const clarifyMutation = trpc.shipflow.triggerClarify.useMutation(
    aiMutationHandlers("AI clarify", AI_CREDIT_COSTS.clarify),
  );
  const prdMutation = trpc.shipflow.triggerPrd.useMutation(
    aiMutationHandlers("Generate PRD", AI_CREDIT_COSTS.prd),
  );
  const tasksMutation = trpc.shipflow.triggerTasks.useMutation(
    aiMutationHandlers("Generate tasks", AI_CREDIT_COSTS.tasks),
  );

  const approvePrdMutation = trpc.shipflow.approvePrd.useMutation({
    onSuccess: async () => {
      toast.success("PRD approved — you can now generate tasks");
      await invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: planApprovalStatus } = trpc.featureRequest.planApprovalStatus.useQuery(
    { featureRequestId: featureId },
    { enabled: feature?.status === "awaiting_plan_approval" },
  );

  const clarifyReplyMutation = trpc.featureRequest.addClarification.useMutation({
    onSuccess: async () => {
      toast.success("Reply saved");
      await invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [clarifyReply, setClarifyReply] = useState("");
  const [isApprovingPlan, startPlanApproval] = useTransition();
  const [isApprovingPrd, startPrdApproval] = useTransition();

  const canGenerateTasks =
    feature?.status === "prd_ready" && feature.prd?.status === "approved";

  const linkedPrKeys = new Set(
    (feature?.pullRequests ?? []).map(
      (pr) => `${pr.repoFullName}#${pr.prNumber}`,
    ),
  );

  const creditAffordance = (cost: number) =>
    getCreditAffordance({ cost, credits, inFlight, billingHref });

  const lowCreditsBanner = getLowCreditsBannerMessage(
    credits,
    (feature?.pullRequests.length ?? 0) > 0,
  );

  if (isLoading) {
    return (
      <LoadingState
        label="Loading feature"
        description="Fetching PRD, tasks, and workflow status."
        variant="features"
        size="lg"
      />
    );
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
            disabled={inFlight || clarifyMutation.isPending}
            title={creditAffordance(AI_CREDIT_COSTS.clarify).hint}
            onClick={() => {
              const { canAfford, hint } = creditAffordance(AI_CREDIT_COSTS.clarify);
              if (!canAfford) {
                toast.error(hint);
                return;
              }
              clarifyMutation.mutate({ featureRequestId: featureId });
            }}
          >
            {clarifyMutation.isPending ? (
              <ButtonLoadingLabel>Starting…</ButtonLoadingLabel>
            ) : (
              `AI clarify (${AI_CREDIT_COSTS.clarify} cr)`
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={inFlight || prdMutation.isPending}
            title={creditAffordance(AI_CREDIT_COSTS.prd).hint}
            onClick={() => {
              const { canAfford, hint } = creditAffordance(AI_CREDIT_COSTS.prd);
              if (!canAfford) {
                toast.error(hint);
                return;
              }
              prdMutation.mutate({ featureRequestId: featureId });
            }}
          >
            {prdMutation.isPending ? (
              <ButtonLoadingLabel>Starting…</ButtonLoadingLabel>
            ) : (
              `Generate PRD (${AI_CREDIT_COSTS.prd} cr)`
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={inFlight || tasksMutation.isPending || !canGenerateTasks}
            title={
              canGenerateTasks
                ? creditAffordance(AI_CREDIT_COSTS.tasks).hint
                : "Approve the PRD before generating tasks"
            }
            onClick={() => {
              const { canAfford, hint } = creditAffordance(AI_CREDIT_COSTS.tasks);
              if (!canAfford) {
                toast.error(hint);
                return;
              }
              tasksMutation.mutate({ featureRequestId: featureId });
            }}
          >
            {tasksMutation.isPending ? (
              <ButtonLoadingLabel>Starting…</ButtonLoadingLabel>
            ) : (
              `Generate tasks (${AI_CREDIT_COSTS.tasks} cr)`
            )}
          </Button>
        </div>
      </div>

      {lowCreditsBanner.show ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {lowCreditsBanner.message}{" "}
            <Link href={billingHref} className="font-medium underline">
              Open Billing to get more credits
            </Link>
            .
          </CardContent>
        </Card>
      ) : null}

      <WorkflowStepper status={feature.status} />

      {feature.status === "rejected" && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            This feature was rejected at the human release gate and will not ship.
            Review the approval audit trail below for reviewer notes.
          </CardContent>
        </Card>
      )}

      {feature.status === "duplicate" && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            This request was flagged as a likely duplicate of an existing feature.
            Review similar requests before proceeding.
          </CardContent>
        </Card>
      )}

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
            {feature.status !== "duplicate" && (
              <form
                className="space-y-2 pt-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!clarifyReply.trim()) return;
                  clarifyReplyMutation.mutate({
                    featureRequestId: featureId,
                    content: clarifyReply.trim(),
                    role: "user",
                  });
                  setClarifyReply("");
                }}
              >
                <Textarea
                  value={clarifyReply}
                  onChange={(event) => setClarifyReply(event.target.value)}
                  placeholder="Reply to clarification questions…"
                  rows={3}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={clarifyReplyMutation.isPending || !clarifyReply.trim()}
                >
                  {clarifyReplyMutation.isPending ? (
                    <ButtonLoadingLabel>Saving…</ButtonLoadingLabel>
                  ) : (
                    "Send reply"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {feature.status === "awaiting_prd_approval" && feature.prd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approve PRD</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Review the generated PRD below. Approve it before breaking work into
              engineering tasks.
            </p>
            <Button
              size="sm"
              disabled={isApprovingPrd || approvePrdMutation.isPending}
              onClick={() => {
                startPrdApproval(async () => {
                  try {
                    await approvePrdAction(featureId);
                    toast.success("PRD approved");
                    await invalidate();
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to approve PRD",
                    );
                  }
                });
              }}
            >
              {isApprovingPrd || approvePrdMutation.isPending ? (
                <ButtonLoadingLabel>Approving…</ButtonLoadingLabel>
              ) : (
                "Approve PRD"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {feature.status === "awaiting_plan_approval" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Approve engineering plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Team review required before development.{" "}
              {planApprovalStatus
                ? `${planApprovalStatus.approvals.length} of ${planApprovalStatus.required} approval(s) recorded.`
                : (
                  <span className="inline-flex items-center gap-2">
                    <LoadingIllustration variant="inline" size="sm" />
                    Loading approval status…
                  </span>
                )}
            </p>
            {planApprovalStatus && planApprovalStatus.approvals.length > 0 && (
              <ul className="space-y-1 text-sm">
                {planApprovalStatus.approvals.map((approval) => (
                  <li key={approval.id} className="text-muted-foreground">
                    ✓ {approval.reviewer.name} ({approval.reviewer.email})
                  </li>
                ))}
              </ul>
            )}
            <Button
              size="sm"
              disabled={
                isApprovingPlan ||
                planApprovalStatus?.currentUserApproved === true
              }
              onClick={() => {
                startPlanApproval(async () => {
                  try {
                    const result = await approvePlanAction(featureId);
                    if (result.complete) {
                      toast.success("Plan fully approved — development can begin");
                    } else {
                      toast.success(
                        `Your approval recorded (${result.approvalCount}/${result.required})`,
                      );
                    }
                    await invalidate();
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Failed to approve plan",
                    );
                  }
                });
              }}
            >
              {planApprovalStatus?.currentUserApproved
                ? "You approved"
                : isApprovingPlan
                  ? "Approving…"
                  : "Approve plan"}
            </Button>
          </CardContent>
        </Card>
      )}

      {feature.prd && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base">PRD</CardTitle>
            <div className="flex items-center gap-2">
              {feature.prd.status === "approved" ? (
                <span className="text-xs text-emerald-600">Approved</span>
              ) : (
                <span className="text-xs text-amber-600">Draft — awaiting approval</span>
              )}
            </div>
            <Link
              href={`/dashboard/prd/${featureId}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              Open in PRD Editor →
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Why this PRD</p>
              <p>
                Built from request: <strong>{feature.title}</strong>
              </p>
              {feature.clarifications.length > 0 ? (
                <p className="mt-1">
                  Informed by {feature.clarifications.length} clarification
                  message(s) above.
                </p>
              ) : null}
            </div>
            <PrdDiffPanel
              aiDraftMarkdown={feature.prd.aiDraftMarkdown}
              currentMarkdown={feature.prd.rawMarkdown}
            />
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

      <PrLinkPanel
        featureRequestId={featureId}
        linkedPullRequests={feature.pullRequests.map((pr) => ({
          id: pr.id,
          repoFullName: pr.repoFullName,
          prNumber: pr.prNumber,
          title: pr.title,
          status: pr.status,
          updatedAt: String(pr.updatedAt),
        }))}
        onUpdated={invalidate}
      />

      <AiReviewPanel
        reviews={feature.aiReviews
          .filter((review) =>
            review.pullRequest
              ? linkedPrKeys.has(
                  `${review.pullRequest.repoFullName}#${review.pullRequest.prNumber}`,
                )
              : false,
          )
          .map((review) => ({
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
