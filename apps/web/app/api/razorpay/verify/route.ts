import { NextResponse } from "next/server";

import { upgradeWorkspaceToPro } from "@/lib/billing/upgrade-workspace";
import { requireSession } from "@/lib/auth-session";
import { createHmac } from "node:crypto";
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

    const expected = createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 401 });
    }

    const result = await upgradeWorkspaceToPro(workspaceId, orderId, paymentId);

    return NextResponse.json({
      ok: true,
      upgraded: result.upgraded,
      alreadyProcessed: !result.upgraded,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Payment verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
