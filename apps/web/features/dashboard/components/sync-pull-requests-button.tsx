"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { LoadingIllustration } from "@/components/ui/loading-illustration";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { friendlySyncError } from "@repo/services/sync-errors";

type SyncStatus = {
  id: string;
  status: "running" | "completed" | "failed";
  totalRepos: number;
  completedRepos: number;
  totalPRs: number;
  completedPRs: number;
  syncedPRs: number;
  changedPRs: number;
  queuedReviews: number;
  errorMessage: string | null;
  message: string | null;
};

/** Connected-repo sync is usually quick — pace the bar for ~6s max. */
const EXPECTED_SYNC_MS = 6_000;

const STARTING_SYNC_STATUS: SyncStatus = {
  id: "__starting__",
  status: "running",
  totalRepos: 0,
  completedRepos: 0,
  totalPRs: 0,
  completedPRs: 0,
  syncedPRs: 0,
  changedPRs: 0,
  queuedReviews: 0,
  errorMessage: null,
  message: "Connecting to GitHub…",
};

function formatRunningText(status: SyncStatus) {
  if (status.id === "__starting__" || status.totalRepos === 0) {
    return status.message ?? "Fetching open pull requests…";
  }
  if (status.completedRepos === 0) {
    return `Syncing ${status.totalRepos} connected ${status.totalRepos === 1 ? "repo" : "repos"}…`;
  }
  if (status.completedRepos < status.totalRepos) {
    return `${status.completedRepos} of ${status.totalRepos} repos synced…`;
  }
  return "Wrapping up…";
}

function SyncProgressPanel({
  status,
  displayPercent,
  className,
}: {
  status: SyncStatus;
  displayPercent: number;
  className?: string;
}) {
  const isRunning = status.status === "running";
  const isCompleted = status.status === "completed";
  const isFailed = status.status === "failed";

  const text =
    isCompleted || isFailed
      ? (status.message ?? (isFailed ? friendlySyncError(status.errorMessage) : "Sync complete."))
      : formatRunningText(status);

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-lg border px-4 py-3",
        isRunning &&
          "border-amber-500/30 bg-amber-500/5 dark:border-amber-400/20 dark:bg-amber-500/10",
        isCompleted &&
          "border-emerald-500/30 bg-emerald-500/5 dark:border-emerald-400/20 dark:bg-emerald-500/10",
        isFailed && "border-destructive/30 bg-destructive/5 dark:bg-destructive/10",
        className,
      )}
    >
      <div className={cn("flex items-center gap-3", isRunning ? "mb-3" : "")}>
        {isRunning ? (
          <LoadingIllustration variant="repos" size="sm" label="Syncing" />
        ) : isCompleted ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="size-4 shrink-0 text-destructive" />
        )}
        <p
          className={cn(
            "text-sm font-medium",
            isRunning && "text-amber-800 dark:text-amber-300",
            isCompleted && "text-emerald-800 dark:text-emerald-300",
            isFailed && "text-destructive",
          )}
        >
          {text}
        </p>
      </div>

      {isRunning ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Connected repos</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {displayPercent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 ease-out"
              style={{ width: `${displayPercent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SyncPullRequestsButton({
  className,
  connectedReposCount = 1,
}: {
  className?: string;
  connectedReposCount?: number;
}) {
  const utils = trpc.useUtils();
  const [panelStatus, setPanelStatus] = useState<SyncStatus | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [displayPercent, setDisplayPercent] = useState(0);
  const syncStartRef = useRef<number | null>(null);
  const syncInFlightRef = useRef(false);

  const runSync = async () => {
    if (syncInFlightRef.current) {
      return;
    }

    if (connectedReposCount === 0) {
      toast.error(
        "Connect at least one repository first.",
        {
          description: "Open Repositories and click Connect on a repo.",
          action: {
            label: "Repositories",
            onClick: () => {
              window.location.href = `${DASHBOARD_BASE_PATH}/repositories`;
            },
          },
        },
      );
      return;
    }

    syncInFlightRef.current = true;
    setDismissedId(null);
    setIsSyncing(true);
    setPanelStatus(STARTING_SYNC_STATUS);
    setDisplayPercent(4);
    syncStartRef.current = Date.now();

    try {
      const response = await fetch("/api/github/sync", { method: "POST" });
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean;
        status?: SyncStatus;
        error?: string;
      } | null;

      if (!body?.status) {
        throw new Error(body?.error ?? "Sync failed");
      }

      setPanelStatus(body.status);
      setDisplayPercent(body.status.status === "completed" ? 100 : 0);

      if (body.status.status === "completed") {
        void utils.review.list.invalidate();
        void utils.review.getActiveSync.invalidate();
        if (body.status.message) {
          toast.success(body.status.message);
        }
      } else if (body.status.status === "failed") {
        const message =
          body.status.message ??
          friendlySyncError(body.status.errorMessage);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Sync failed unexpectedly.";
      setPanelStatus({
        id: "__failed__",
        status: "failed",
        totalRepos: 0,
        completedRepos: 0,
        totalPRs: 0,
        completedPRs: 0,
        syncedPRs: 0,
        changedPRs: 0,
        queuedReviews: 0,
        errorMessage: message,
        message: friendlySyncError(message),
      });
      toast.error(friendlySyncError(message));
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  };

  const showPanel =
    panelStatus !== null && panelStatus.id !== dismissedId;

  useEffect(() => {
    if (!isSyncing) {
      if (panelStatus?.status !== "running") {
        syncStartRef.current = null;
      }
      return;
    }

    if (!syncStartRef.current) {
      syncStartRef.current = Date.now();
    }

    const tick = () => {
      const elapsed = Date.now() - (syncStartRef.current ?? Date.now());
      const timePct = Math.min(92, (elapsed / EXPECTED_SYNC_MS) * 92);
      setDisplayPercent((prev) => Math.max(prev, Math.round(timePct)));
    };

    tick();
    const id = setInterval(tick, 150);
    return () => clearInterval(id);
  }, [isSyncing, panelStatus?.status]);

  const resolvedDisplayPercent =
    !isSyncing && panelStatus?.status === "completed" ? 100 : displayPercent;

  return (
    <div className={cn("flex flex-col items-end gap-3", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={isSyncing}
        onClick={() => void runSync()}
      >
        {isSyncing ? (
          <LoadingIllustration variant="inline" size="sm" label="Syncing" />
        ) : (
          <RefreshCw />
        )}
        Sync from GitHub
      </Button>

      {showPanel && panelStatus ? (
        <div className="flex w-full flex-col items-end gap-2">
          <SyncProgressPanel
            status={panelStatus}
            displayPercent={resolvedDisplayPercent}
          />
          {panelStatus.status !== "running" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setDismissedId(panelStatus.id)}
            >
              Dismiss
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
