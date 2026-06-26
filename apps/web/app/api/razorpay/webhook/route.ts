import { NextResponse } from "next/server";

import { upgradeWorkspaceToPro } from "@/lib/billing/upgrade-workspace";
import { verifyRazorpayWebhookSignature } from "@/lib/razorpay";

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
  const orderId = payment?.order_id ?? payload.payload?.order?.entity?.id;

  if (!workspaceId || !orderId || payment?.status !== "captured") {
    return NextResponse.json({ error: "Missing workspace context" }, { status: 400 });
  }

  const result = await upgradeWorkspaceToPro(
    workspaceId,
    orderId,
    payment.id,
  );

  return NextResponse.json({
    ok: true,
    upgraded: result.upgraded,
    alreadyProcessed: !result.upgraded,
  });
}
