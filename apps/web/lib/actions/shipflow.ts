"use server";

import { revalidatePath } from "next/cache";

import { inngest } from "@/features/inngest/client";
import { queueReviewForPullRequest } from "@/features/reviews/server/trigger-review";
import { requestManualReReview } from "@/features/shipflow/server/feature-workflow";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { ensureDefaultWorkspace } from "@repo/services";

export async function ensureWorkspaceAction() {
  const session = await requireSession();
  const workspace = await ensureDefaultWorkspace(
    session.user.id,
    session.user.name ?? "User",
  );
  return workspace;
}

export async function triggerClarificationAction(featureRequestId: string) {
  await requireSession();
  await inngest.send({
    name: "shipflow/feature.clarify",
    data: { featureRequestId },
  });
  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
}

export async function triggerPrdGenerationAction(featureRequestId: string) {
  await requireSession();
  await inngest.send({
    name: "shipflow/prd.generate",
    data: { featureRequestId },
  });
  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
}

export async function triggerTaskGenerationAction(featureRequestId: string) {
  await requireSession();
  await inngest.send({
    name: "shipflow/tasks.generate",
    data: { featureRequestId },
  });
  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
  revalidatePath("/dashboard/tasks");
}

export async function approveReleaseAction(
  featureRequestId: string,
  notes?: string
) {
  const session = await requireSession();

  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    select: { status: true },
  });

  if (!feature || feature.status !== "awaiting_approval") {
    throw new Error("Feature is not awaiting approval");
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

  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
}

export async function rejectReleaseAction(
  featureRequestId: string,
  notes?: string
) {
  const session = await requireSession();

  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    select: { status: true },
  });

  if (!feature || feature.status !== "awaiting_approval") {
    throw new Error("Feature is not awaiting approval");
  }

  await prisma.$transaction([
    prisma.releaseApproval.create({
      data: {
        featureRequestId,
        reviewerId: session.user.id,
        decision: "rejected",
        notes: notes?.trim() || null,
      },
    }),
    prisma.featureRequest.update({
      where: { id: featureRequestId },
      data: { status: "fix_needed" },
    }),
  ]);

  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
}

export async function requestReReviewAction(featureRequestId: string) {
  await requireSession();

  const pullRequest = await requestManualReReview(featureRequestId);

  await queueReviewForPullRequest({
    installationId: pullRequest.installationId,
    repoFullName: pullRequest.repoFullName,
    prNumber: pullRequest.prNumber,
    title: pullRequest.title,
    authorLogin: pullRequest.authorLogin,
    headSha: pullRequest.head.sha,
    baseBranch: pullRequest.baseBranch,
    action: "synchronize",
  });

  revalidatePath(`/dashboard/feature-requests/${featureRequestId}`);
  revalidatePath("/dashboard/pull-requests");
}
