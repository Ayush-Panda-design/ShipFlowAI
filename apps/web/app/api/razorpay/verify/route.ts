import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

import { PRO_PLAN_LIMITS } from "@/lib/razorpay";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

function readSecret() {
  return process.env.RAZORPAY_KEY_SECRET?.trim();
}

export async function POST(request: Request) {
  try {
    const session = await requireSession("/dashboard/billing");
    const secret = readSecret();

    if (!secret) {
      return NextResponse.json(
        { error: "Razorpay is not configured" },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      workspaceId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    const {
      workspaceId,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    } = body;

    if (!workspaceId || !orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: session.user.id },
    });

    if (!membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const expected = createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 401 });
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
          razorpaySubscriptionId: orderId,
        },
        update: {
          plan: "pro",
          status: "active",
          razorpaySubscriptionId: orderId,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
