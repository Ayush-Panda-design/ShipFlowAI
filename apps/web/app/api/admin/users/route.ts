import { NextResponse } from "next/server";

import { listPlatformUsers } from "@/features/admin/server/list-platform-users";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getServerSession } from "@/lib/auth-session";

export async function GET() {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await isPlatformAdmin(session.user.id);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await listPlatformUsers();
  return NextResponse.json(data);
}
