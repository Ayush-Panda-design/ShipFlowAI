import { NextResponse } from "next/server";

import {
  PRO_PLAN_LIMITS,
  verifyRazorpayWebhookSignature,
} from "@/lib/razorpay";
import { prisma } from "@/lib/db";

type RazorpayWebhookPayload = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        notes?: Record<string, string>;
      };
    };
    order?: {
      entity?: {
        id?: string;
        notes?: Record<string, string>;
      };
    };
  };
};

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature || !verifyRazorpayWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(body) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = payload.payload?.payment?.entity;
  const workspaceId =
    payment?.notes?.workspaceId ??
    payload.payload?.order?.entity?.notes?.workspaceId;

  if (!workspaceId || payment?.status !== "captured") {
    return NextResponse.json({ error: "Missing workspace context" }, { status: 400 });
  }

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
        razorpaySubscriptionId: payment.order_id ?? payment.id ?? null,
      },
      update: {
        plan: "pro",
        status: "active",
        razorpaySubscriptionId: payment.order_id ?? payment.id ?? null,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
