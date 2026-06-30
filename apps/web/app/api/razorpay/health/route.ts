import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth-session";
import {
  formatRazorpayClientError,
  getRazorpayConfigError,
  verifyRazorpayCredentials,
} from "@/lib/razorpay";

/** Read-only Razorpay credential check (no plans or subscriptions created). */
export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const configError = getRazorpayConfigError();
  if (configError) {
    return NextResponse.json(
      { ok: false, configured: false, error: configError },
      { status: 503 },
    );
  }

  try {
    await verifyRazorpayCredentials();
    return NextResponse.json({
      ok: true,
      configured: true,
      message: "Razorpay API keys are valid.",
    });
  } catch (error) {
    const { message, status } = formatRazorpayClientError(error);
    return NextResponse.json(
      { ok: false, configured: true, error: message },
      { status },
    );
  }
}
