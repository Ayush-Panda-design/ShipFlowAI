import { NextResponse } from "next/server";

import { createProCheckoutOrder, getRazorpayConfigError } from "@/lib/razorpay";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await requireSession("/dashboard/billing");
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

    const checkout = await createProCheckoutOrder(workspaceId);

    return NextResponse.json({
      ...checkout,
      prefill: {
        name: session.user.name,
        email: session.user.email,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
