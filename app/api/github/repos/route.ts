import { NextRequest, NextResponse } from "next/server";

import { getInstallationForUser } from "@/features/github/server/installation";
import { getInstallationReposPage } from "@/features/github/server/repos";
import { getServerSession } from "@/lib/auth-session";

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installation = await getInstallationForUser(session.user.id);
  if (!installation) {
    return NextResponse.json(
      { error: "GitHub App not installed" },
      { status: 404 }
    );
  }

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  if (!Number.isFinite(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  }

  try {
    const result = await getInstallationReposPage(
      installation.installationId,
      page
    );
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
