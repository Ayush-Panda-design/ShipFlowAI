"use server";

import { revalidatePath } from "next/cache";

import { mergeFeaturePullRequests } from "@/features/github/server/merge-feature-prs";
import { queueReviewForPullRequest } from "@/features/reviews/server/trigger-review";
import { requestManualReReview } from "@/features/shipflow/server/feature-workflow";
import { runTasksJob } from "@/features/shipflow/server/run-shipflow-jobs";
import { formatUserFriendlyError } from "@/features/shipflow/server/user-friendly-errors";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceForUser, WORKSPACE_COOKIE } from "@/lib/active-workspace";
import { PROJECT_COOKIE } from "@/lib/active-project";
import {
  AI_CREDIT_COSTS,
  assertHasCredits,
  approvePrd,
  connectRepositoryToProject,
  disconnectRepositoryFromProject,
  InsufficientCreditsError,
  recordActivityEvent,
  recordPlanApproval,
  resolveWorkspaceIdForFeature,
  sendClarifyJob,
  sendPrdJob,
  updateFeatureStatus,
} from "@repo/services";

export async function ensureWorkspaceAction() {
  const session = await requireSession();
  return getActiveWorkspaceForUser(
    session.user.id,
    session.user.name ?? "User",
  );
}

async function assertFeatureCredits(
  featureRequestId: string,
  cost: number,
) {
  const resolution = await resolveWorkspaceIdForFeature(featureRequestId);
  if (!resolution.ok) {
    throw new Error(
      resolution.reason === "feature_not_found"
        ? "Feature not found"
        : "Workspace not found for this feature",
    );
  }

  await assertHasCredits(resolution.workspaceId, cost);
  return resolution.workspaceId;
}

export async function triggerClarificationAction(featureRequestId: string) {
  await requireSession();
  await assertFeatureCredits(featureRequestId, AI_CREDIT_COSTS.clarify);
  await sendClarifyJob(featureRequestId);
  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
}

export async function triggerPrdGenerationAction(featureRequestId: string) {
  await requireSession();
  await assertFeatureCredits(featureRequestId, AI_CREDIT_COSTS.prd);
  await sendPrdJob(featureRequestId);
  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
}

export async function triggerTaskGenerationAction(featureRequestId: string) {
  await requireSession();
  await assertFeatureCredits(featureRequestId, AI_CREDIT_COSTS.tasks);
  try {
    await runTasksJob(featureRequestId);
  } catch (error) {
    throw new Error(formatUserFriendlyError(error));
  }
  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
  revalidatePath("/dashboard/tasks");
}

export { InsufficientCreditsError };

async function assertWorkspaceFeatureAccess(
  featureRequestId: string,
  userId: string,
  userName: string,
) {
  const workspace = await getActiveWorkspaceForUser(userId, userName);
  const feature = await prisma.featureRequest.findFirst({
    where: {
      id: featureRequestId,
      project: { workspaceId: workspace.id },
    },
    select: { id: true, status: true, title: true, projectId: true },
  });

  if (!feature) {
    throw new Error("Feature not found");
  }

  return { workspace, feature };
}

export async function approveReleaseAction(
  featureRequestId: string,
  notes?: string
) {
  const session = await requireSession();
  const { workspace, feature } = await assertWorkspaceFeatureAccess(
    featureRequestId,
    session.user.id,
    session.user.name ?? "User",
  );

  const approvableStatuses = new Set(["awaiting_approval", "fix_needed"]);

  if (!approvableStatuses.has(feature.status)) {
    throw new Error("Feature cannot be approved in its current state");
  }

  await prisma.$transaction([
    prisma.releaseApproval.create({
      data: {
        featureRequestId,
        reviewerId: session.user.id,
        decision: "approved",
        notes: notes?.trim() || null,
      },
    }),
    prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: { status: "shipped" },
    }),
  ]);

  let mergeResults: Awaited<ReturnType<typeof mergeFeaturePullRequests>> = [];
  try {
    mergeResults = await mergeFeaturePullRequests(featureRequestId, feature.title);
  } catch {
    // Shipping succeeds even if GitHub merge is unavailable.
  }

  const mergedCount = mergeResults.filter((result) => result.merged).length;
  const mergeDetail =
    mergeResults.length === 0
      ? notes?.trim() || "Approved for release by human reviewer."
      : mergeResults.every((result) => result.merged)
        ? `Approved and merged ${mergedCount} linked PR(s).`
        : `Approved. Merged ${mergedCount}/${mergeResults.length} linked PR(s).`;

  await recordActivityEvent({
    workspaceId: workspace.id,
    actorId: session.user.id,
    type: "feature_shipped",
    title: `Feature shipped: ${feature.title}`,
    detail: mergeDetail,
    metadata: { featureRequestId, mergeResults },
  });

  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard/shipped");
  revalidatePath("/dashboard/activity");
  revalidatePath("/dashboard/pull-requests");
}

export async function rejectReleaseAction(
  featureRequestId: string,
  notes?: string
) {
  const session = await requireSession();
  const { workspace, feature } = await assertWorkspaceFeatureAccess(
    featureRequestId,
    session.user.id,
    session.user.name ?? "User",
  );

  if (feature.status !== "awaiting_approval") {
    throw new Error("Feature is not awaiting approval");
  }

  const trimmedNotes = notes?.trim();
  if (!trimmedNotes) {
    throw new Error("Rejection notes are required — describe what must be fixed");
  }

  await prisma.$transaction([
    prisma.releaseApproval.create({
      data: {
        featureRequestId,
        reviewerId: session.user.id,
        decision: "rejected",
        notes: trimmedNotes,
      },
    }),
    prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: { status: "rejected" },
    }),
  ]);

  await recordActivityEvent({
    workspaceId: workspace.id,
    actorId: session.user.id,
    type: "release_rejected",
    title: `Release rejected: ${feature.title}`,
    detail: trimmedNotes,
    metadata: { featureRequestId },
  });

  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
  revalidatePath("/dashboard/approvals");
  revalidatePath("/dashboard/activity");
}

export async function approvePrdAction(featureRequestId: string) {
  const session = await requireSession();
  const workspace = await getActiveWorkspaceForUser(
    session.user.id,
    session.user.name ?? "User",
  );

  const feature = await prisma.featureRequest.findFirst({
    where: {
      id: featureRequestId,
      project: { workspaceId: workspace.id },
    },
    include: { prd: { select: { id: true, status: true } } },
  });

  if (!feature?.prd) {
    throw new Error("PRD not found for this feature");
  }

  if (feature.status !== "awaiting_prd_approval") {
    throw new Error("Feature is not awaiting PRD approval");
  }

  await approvePrd(featureRequestId);
  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
  revalidatePath(`/dashboard/prd/${featureRequestId}`);
  revalidatePath("/dashboard/prd");
}

export async function requestReReviewAction(featureRequestId: string) {
  await requireSession();
  await assertFeatureCredits(featureRequestId, AI_CREDIT_COSTS.review);

  const pullRequest = await requestManualReReview(featureRequestId);

  await queueReviewForPullRequest({
    installationId: pullRequest.installationId,
    repoFullName: pullRequest.repoFullName,
    prNumber: pullRequest.prNumber,
    title: pullRequest.title,
    authorLogin: pullRequest.authorLogin,
    headSha: pullRequest.headSha,
    baseBranch: pullRequest.baseBranch,
    action: "synchronize",
  });

  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
  revalidatePath("/dashboard/pull-requests");
}

export async function updatePrdAction(
  featureRequestId: string,
  rawMarkdown: string,
) {
  const session = await requireSession();
  const workspace = await getActiveWorkspaceForUser(
    session.user.id,
    session.user.name ?? "User",
  );

  const feature = await prisma.featureRequest.findFirst({
    where: {
      id: featureRequestId,
      project: { workspaceId: workspace.id },
    },
    select: { id: true, prd: { select: { id: true } } },
  });

  if (!feature?.prd) {
    throw new Error("PRD not found for this feature");
  }

  const trimmed = rawMarkdown.trim();
  if (!trimmed) {
    throw new Error("PRD cannot be empty");
  }

  await prisma.pRD.update({
    where: { featureRequestId },
    data: { rawMarkdown: trimmed },
  });

  revalidatePath(`/dashboard/prd/${featureRequestId}`);
  revalidatePath("/dashboard/prd");
  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
}

export async function approvePlanAction(featureRequestId: string) {
  const session = await requireSession();
  const workspace = await getActiveWorkspaceForUser(
    session.user.id,
    session.user.name ?? "User",
  );

  const feature = await prisma.featureRequest.findFirst({
    where: {
      id: featureRequestId,
      project: { workspaceId: workspace.id },
    },
    select: { status: true },
  });

  if (!feature || feature.status !== "awaiting_plan_approval") {
    throw new Error("Feature is not awaiting plan approval");
  }

  const result = await recordPlanApproval(
    featureRequestId,
    session.user.id,
    workspace.id,
  );

  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
  revalidatePath("/dashboard/tasks");
  return result;
}

export async function connectRepositoryAction(
  projectId: string,
  repoFullName: string,
  installationId: number,
  defaultBranch?: string,
  githubRepoId?: number,
) {
  const session = await requireSession();
  const workspace = await getActiveWorkspaceForUser(
    session.user.id,
    session.user.name ?? "User",
  );

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  await connectRepositoryToProject({
    workspaceId: workspace.id,
    projectId,
    repoFullName,
    installationId,
    defaultBranch,
    githubRepoId,
  });

  revalidatePath("/dashboard/repositories");
  revalidatePath("/dashboard/billing");
}

export async function disconnectRepositoryAction(
  projectId: string,
  repoFullName: string,
) {
  await requireSession();
  await disconnectRepositoryFromProject(projectId, repoFullName);
  revalidatePath("/dashboard/repositories");
  revalidatePath("/dashboard/billing");
}

export async function setActiveWorkspaceAction(workspaceId: string) {
  const session = await requireSession();
  const workspaces = await import("@repo/services").then((m) =>
    m.listWorkspacesForUser(session.user.id),
  );
  if (!workspaces.some((workspace) => workspace.id === workspaceId)) {
    throw new Error("Workspace not found");
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(WORKSPACE_COOKIE, workspaceId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  revalidatePath("/dashboard");
}

export async function setActiveProjectAction(projectId: string) {
  const session = await requireSession();
  const workspace = await getActiveWorkspaceForUser(
    session.user.id,
    session.user.name ?? "User",
  );

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId: workspace.id },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(PROJECT_COOKIE, projectId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  revalidatePath("/dashboard/feature-requests");
  revalidatePath("/dashboard/tasks");
}
