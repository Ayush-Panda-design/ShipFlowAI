"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { getDashboardRoute } from "@/features/dashboard/lib/routes";

const HEARTBEAT_INTERVAL_MS = 30_000;
const VISIT_STORAGE_KEY = "shipflow_visit_id";

type TrackEvent = {
  visitId: string;
  type: "page_view" | "heartbeat" | "action" | "session_end";
  path?: string;
  pageTitle?: string;
  action?: string;
  detail?: string;
  durationMs?: number;
};

function getOrCreateVisitId() {
  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  const existing = sessionStorage.getItem(VISIT_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const visitId = crypto.randomUUID();
  sessionStorage.setItem(VISIT_STORAGE_KEY, visitId);
  return visitId;
}

function sendEvents(events: TrackEvent[], useBeacon = false) {
  if (events.length === 0) {
    return;
  }

  const body = JSON.stringify({ events });
  const url = "/api/analytics/track";

  if (useBeacon && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Best-effort analytics; ignore network errors.
  });
}

export function trackUserAction(action: string, detail?: string) {
  const visitId = getOrCreateVisitId();
  const path = window.location.pathname;
  const route = getDashboardRoute(path);

  sendEvents([
    {
      visitId,
      type: "action",
      path,
      pageTitle: route?.title,
      action,
      detail,
    },
  ]);
}

export function SiteActivityTracker() {
  const pathname = usePathname();
  const visitIdRef = useRef<string | null>(null);
  const pageEnteredAtRef = useRef<number>(Date.now());
  const lastPathRef = useRef<string | null>(null);
  const lastTitleRef = useRef<string | null>(null);

  useEffect(() => {
    visitIdRef.current = getOrCreateVisitId();
  }, []);

  useEffect(() => {
    const visitId = visitIdRef.current ?? getOrCreateVisitId();
    const now = Date.now();
    const route = getDashboardRoute(pathname);

    if (lastPathRef.current && lastPathRef.current !== pathname) {
      sendEvents([
        {
          visitId,
          type: "page_view",
          path: lastPathRef.current,
          pageTitle: lastTitleRef.current ?? undefined,
          durationMs: now - pageEnteredAtRef.current,
        },
      ]);
    }

    lastPathRef.current = pathname;
    lastTitleRef.current = route?.title ?? null;
    pageEnteredAtRef.current = now;
  }, [pathname]);

  useEffect(() => {
    const visitId = visitIdRef.current ?? getOrCreateVisitId();

    const heartbeat = window.setInterval(() => {
      const path = lastPathRef.current ?? window.location.pathname;
      sendEvents([
        {
          visitId,
          type: "heartbeat",
          path,
          pageTitle: lastTitleRef.current ?? undefined,
          durationMs: HEARTBEAT_INTERVAL_MS,
        },
      ]);
    }, HEARTBEAT_INTERVAL_MS);

    const handleVisibility = () => {
      if (document.visibilityState !== "hidden") {
        return;
      }

      const path = lastPathRef.current ?? window.location.pathname;
      const durationMs = Date.now() - pageEnteredAtRef.current;

      sendEvents(
        [
          {
            visitId,
            type: "page_view",
            path,
            pageTitle: lastTitleRef.current ?? undefined,
            durationMs,
          },
          {
            visitId,
            type: "session_end",
            path,
            durationMs: 0,
          },
        ],
        true,
      );
    };

    const handlePageHide = () => {
      handleVisibility();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  return null;
}
