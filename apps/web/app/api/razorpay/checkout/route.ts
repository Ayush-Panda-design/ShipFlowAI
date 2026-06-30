import { NextResponse } from "next/server";

import { recordRazorpaySubscription } from "@/lib/billing/razorpay-order";
import {
  createProSubscription,
  formatRazorpayClientError,
  getRazorpayConfigError,
} from "@/lib/razorpay";
import { getServerSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }
    const configError = getRazorpayConfigError();

    if (configError) {
      return NextResponse.json({ error: configError }, { status: 503 });
    }

    const body = (await request.json()) as { workspaceId?: string };
    const workspaceId = body.workspaceId;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: session.user.id },
      select: { role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (membership.role !== "owner") {
      return NextResponse.json(
        { error: "Only workspace owners can upgrade billing" },
        { status: 403 },
      );
    }

    const checkout = await createProSubscription(workspaceId);

    await recordRazorpaySubscription({
      razorpaySubscriptionId: checkout.subscriptionId,
      workspaceId,
      amountPaise: checkout.amount,
    });

    return NextResponse.json({
      keyId: checkout.keyId,
      subscriptionId: checkout.subscriptionId,
      amount: checkout.amount,
      currency: checkout.currency,
      prefill: {
        name: session.user.name,
        email: session.user.email,
      },
    });
  } catch (error) {
    console.error("[razorpay/checkout]", error);
    const { message, status, diagnostics } = formatRazorpayClientError(error);
    return NextResponse.json({ error: message, diagnostics }, { status });
  }
}
