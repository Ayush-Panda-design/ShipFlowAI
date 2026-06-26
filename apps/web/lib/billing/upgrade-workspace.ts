import { PRO_PLAN_LIMITS } from "@/lib/razorpay";
import { prisma } from "@/lib/db";

const PRO_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export type UpgradeWorkspaceResult =
  | { ok: true; upgraded: true }
  | { ok: true; upgraded: false; reason: "already_processed" };

/** Idempotent Pro upgrade after Razorpay payment (verify route + webhook). */
export async function upgradeWorkspaceToPro(
  workspaceId: string,
  razorpayOrderId: string,
  razorpayPaymentId?: string,
): Promise<UpgradeWorkspaceResult> {
  const existing = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { plan: true, razorpaySubscriptionId: true, razorpayPaymentId: true },
  });

  if (
    existing?.plan === "pro" &&
    (existing.razorpayPaymentId === razorpayPaymentId ||
      existing.razorpaySubscriptionId === razorpayOrderId)
  ) {
    return { ok: true, upgraded: false, reason: "already_processed" };
  }

  const periodEnd = new Date(Date.now() + PRO_PERIOD_MS);

  await prisma.$transaction([
    prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        plan: "pro",
        aiCredits: PRO_PLAN_LIMITS.aiCredits,
        repoLimit: PRO_PLAN_LIMITS.repoLimit,
      },
    }),
    prisma.subscription.upsert({
      where: { workspaceId },
      create: {
        workspaceId,
        plan: "pro",
        status: "active",
        razorpaySubscriptionId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId ?? null,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: "pro",
        status: "active",
        razorpaySubscriptionId: razorpayOrderId,
        razorpayPaymentId: razorpayPaymentId ?? null,
        currentPeriodEnd: periodEnd,
      },
    }),
  ]);

  return { ok: true, upgraded: true };
}
