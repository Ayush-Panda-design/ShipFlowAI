import { NextResponse } from "next/server";
import { z } from "zod";

import { getServerSession } from "@/lib/auth-session";
import { recordUserSiteEvents } from "@repo/services";

const eventSchema = z.object({
  visitId: z.string().min(1).max(64),
  type: z.enum(["page_view", "heartbeat", "action", "session_end"]),
  path: z.string().max(500).optional(),
  pageTitle: z.string().max(200).optional(),
  action: z.string().max(200).optional(),
  detail: z.string().max(2000).optional(),
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const bodySchema = z.object({
  events: z.array(eventSchema).min(1).max(20),
});

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await recordUserSiteEvents(session.user.id, parsed.data.events);

  return NextResponse.json({ ok: true });
}
