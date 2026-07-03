import { NextResponse } from "next/server";

import { fetchUserAnalytics } from "@/features/admin/server/get-user-analytics";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getServerSession } from "@/lib/auth-session";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await isPlatformAdmin(session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userId } = await context.params;
  const data = await fetchUserAnalytics(userId);

  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
