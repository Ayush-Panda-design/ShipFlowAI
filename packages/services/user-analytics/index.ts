import { prisma } from "@repo/database";

import { backfillMissingSessionLocations } from "../ip-geolocation";

export type SiteEventInput = {
  visitId: string;
  type: "page_view" | "heartbeat" | "action" | "session_end";
  path?: string;
  pageTitle?: string;
  action?: string;
  detail?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};



export async function recordUserSiteEvents(
  userId: string,
  events: SiteEventInput[],
) {
  if (events.length === 0) {
    return;
  }

  await prisma.userSiteEvent.createMany({
    data: events.map((event) => ({
      userId,
      visitId: event.visitId,
      type: event.type,
      path: event.path ?? null,
      pageTitle: event.pageTitle ?? null,
      action: event.action ?? null,
      detail: event.detail ?? null,
      durationMs: event.durationMs ?? 0,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    })),
  });
}

export type UserAnalyticsSummary = {
  totalTimeMs: number;
  sessionTimeMs: number;
  trackedTimeMs: number;
  totalVisits: number;
  totalPageViews: number;
  totalActions: number;
  lastActiveAt: string | null;
  pageBreakdown: {
    path: string;
    pageTitle: string | null;
    visits: number;
    timeMs: number;
  }[];
  recentEvents: {
    id: string;
    type: string;
    path: string | null;
    pageTitle: string | null;
    action: string | null;
    detail: string | null;
    durationMs: number;
    visitId: string;
    createdAt: string;
  }[];
  visitSessions: {
    visitId: string;
    startedAt: string;
    endedAt: string;
    durationMs: number;
    pageCount: number;
    actionCount: number;
    pages: string[];
  }[];
};

function sumDuration(events: { durationMs: number; type: string }[]) {
  return events.reduce((total, event) => {
    if (event.type === "page_view" || event.type === "heartbeat") {
      return total + event.durationMs;
    }
    return total;
  }, 0);
}

export async function getUserAnalytics(
  userId: string,
  options?: { eventLimit?: number },
): Promise<UserAnalyticsSummary> {
  const eventLimit = options?.eventLimit ?? 100;

  const [events, signInSessions] = await Promise.all([
    prisma.userSiteEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
    getUserSignInSessions(userId),
  ]);

  const sessionTimeMs = signInSessions.reduce(
    (sum, session) => sum + session.activityDurationMs,
    0,
  );
  const trackedTimeMs = sumDuration(events);
  const totalTimeMs = trackedTimeMs > 0 ? trackedTimeMs : sessionTimeMs;

  const pageMap = new Map<
    string,
    { pageTitle: string | null; visits: number; timeMs: number }
  >();
  const visitMap = new Map<
    string,
    {
      startedAt: Date;
      endedAt: Date;
      pages: Set<string>;
      pageCount: number;
      actionCount: number;
      durationMs: number;
    }
  >();

  let totalPageViews = 0;
  let totalActions = 0;

  for (const event of events) {
    if (event.type === "page_view") {
      totalPageViews += 1;
      const key = event.path ?? "unknown";
      const existing = pageMap.get(key) ?? {
        pageTitle: event.pageTitle,
        visits: 0,
        timeMs: 0,
      };
      existing.visits += 1;
      existing.timeMs += event.durationMs;
      if (!existing.pageTitle && event.pageTitle) {
        existing.pageTitle = event.pageTitle;
      }
      pageMap.set(key, existing);
    }

    if (event.type === "action") {
      totalActions += 1;
    }

    const visit = visitMap.get(event.visitId) ?? {
      startedAt: event.createdAt,
      endedAt: event.createdAt,
      pages: new Set<string>(),
      pageCount: 0,
      actionCount: 0,
      durationMs: 0,
    };

    if (event.createdAt < visit.startedAt) {
      visit.startedAt = event.createdAt;
    }
    if (event.createdAt > visit.endedAt) {
      visit.endedAt = event.createdAt;
    }
    if (event.type === "page_view" && event.path) {
      visit.pages.add(event.pageTitle ?? event.path);
      visit.pageCount += 1;
    }
    if (event.type === "action") {
      visit.actionCount += 1;
    }
    if (event.type === "page_view" || event.type === "heartbeat") {
      visit.durationMs += event.durationMs;
    }

    visitMap.set(event.visitId, visit);
  }

  const pageBreakdown = [...pageMap.entries()]
    .map(([path, stats]) => ({
      path,
      pageTitle: stats.pageTitle,
      visits: stats.visits,
      timeMs: stats.timeMs,
    }))
    .sort((a, b) => b.timeMs - a.timeMs);

  const visitSessions = [...visitMap.entries()]
    .map(([visitId, visit]) => ({
      visitId,
      startedAt: visit.startedAt.toISOString(),
      endedAt: visit.endedAt.toISOString(),
      durationMs: visit.durationMs,
      pageCount: visit.pageCount,
      actionCount: visit.actionCount,
      pages: [...visit.pages],
    }))
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

  const recentEvents = events.slice(0, eventLimit).map((event) => ({
    id: event.id,
    type: event.type,
    path: event.path,
    pageTitle: event.pageTitle,
    action: event.action,
    detail: event.detail,
    durationMs: event.durationMs,
    visitId: event.visitId,
    createdAt: event.createdAt.toISOString(),
  }));

  return {
    totalTimeMs,
    sessionTimeMs,
    trackedTimeMs,
    totalVisits: visitMap.size,
    totalPageViews,
    totalActions,
    lastActiveAt: events[0]?.createdAt.toISOString() ?? null,
    pageBreakdown,
    recentEvents,
    visitSessions,
  };
}

export async function getUsersTimeSummary(
  userIds: string[],
): Promise<Map<string, { trackedTimeMs: number; sessionTimeMs: number; totalTimeMs: number }>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const [events, sessions] = await Promise.all([
    prisma.userSiteEvent.findMany({
      where: {
        userId: { in: userIds },
        type: { in: ["page_view", "heartbeat"] },
      },
      select: {
        userId: true,
        durationMs: true,
      },
    }),
    prisma.session.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const tracked = new Map<string, number>();
  for (const event of events) {
    tracked.set(
      event.userId,
      (tracked.get(event.userId) ?? 0) + event.durationMs,
    );
  }

  const sessionTotals = new Map<string, number>();
  for (const session of sessions) {
    const duration = Math.max(
      0,
      session.updatedAt.getTime() - session.createdAt.getTime(),
    );
    sessionTotals.set(
      session.userId,
      (sessionTotals.get(session.userId) ?? 0) + duration,
    );
  }

  const totals = new Map<
    string,
    { trackedTimeMs: number; sessionTimeMs: number; totalTimeMs: number }
  >();

  for (const userId of userIds) {
    const trackedTimeMs = tracked.get(userId) ?? 0;
    const sessionTimeMs = sessionTotals.get(userId) ?? 0;
    totals.set(userId, {
      trackedTimeMs,
      sessionTimeMs,
      totalTimeMs: trackedTimeMs > 0 ? trackedTimeMs : sessionTimeMs,
    });
  }

  return totals;
}

export type SignInSessionRow = {
  id: string;
  signedInAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
  activityDurationMs: number;
  ipAddress: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  locationLabel: string | null;
  userAgent: string | null;
  deviceLabel: string;
};

export function formatSignInLocation(parts: {
  city: string | null;
  region: string | null;
  country: string | null;
}): string | null {
  const segments = [parts.city, parts.region, parts.country].filter(
    (value): value is string => Boolean(value),
  );
  return segments.length > 0 ? segments.join(", ") : null;
}

function summarizeUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return "Unknown device";
  }

  if (userAgent.includes("Edg/")) {
    return "Microsoft Edge";
  }
  if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/")) {
    return "Chrome";
  }
  if (userAgent.includes("Firefox/")) {
    return "Firefox";
  }
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) {
    return "Safari";
  }

  return userAgent.length > 48 ? `${userAgent.slice(0, 48)}…` : userAgent;
}

export async function getUserSignInSessions(
  userId: string,
  limit = 50,
): Promise<SignInSessionRow[]> {
  const now = new Date();

  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      expiresAt: true,
      ipAddress: true,
      city: true,
      region: true,
      country: true,
      userAgent: true,
    },
  });

  const backfilled = await backfillMissingSessionLocations(sessions);

  return sessions.map((session) => {
    const location = backfilled.get(session.id);
    const city = location?.city ?? session.city;
    const region = location?.region ?? session.region;
    const country = location?.country ?? session.country;

    return {
      id: session.id,
      signedInAt: session.createdAt.toISOString(),
      lastActiveAt: session.updatedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isActive: session.expiresAt > now,
      activityDurationMs: Math.max(
        0,
        session.updatedAt.getTime() - session.createdAt.getTime(),
      ),
      ipAddress: session.ipAddress,
      city,
      region,
      country,
      locationLabel: formatSignInLocation({ city, region, country }),
      userAgent: session.userAgent,
      deviceLabel: summarizeUserAgent(session.userAgent),
    };
  });
}
