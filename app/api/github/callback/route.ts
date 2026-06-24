import { NextRequest, NextResponse } from "next/server";

import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { saveInstallationFromGitHub } from "@/features/github/server/installation";
import { getServerSession } from "@/lib/auth-session";

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const installationId = request.nextUrl.searchParams.get("installation_id");
  const state = request.nextUrl.searchParams.get("state");

  if (!installationId || !state) {
    return NextResponse.redirect(
      new URL(
        `${DASHBOARD_BASE_PATH}/github-app?error=missing_params`,
        request.url
      )
    );
  }

  if (state !== session.user.id) {
    return NextResponse.redirect(
      new URL(
        `${DASHBOARD_BASE_PATH}/github-app?error=invalid_state`,
        request.url
      )
    );
  }

  try {
    await saveInstallationFromGitHub(session.user.id, Number(installationId));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[github/callback] save failed:", error);
    }
    return NextResponse.redirect(
      new URL(
        `${DASHBOARD_BASE_PATH}/github-app?error=save_failed`,
        request.url
      )
    );
  }

  return NextResponse.redirect(
    new URL(`${DASHBOARD_BASE_PATH}/github-app`, request.url)
  );
}
