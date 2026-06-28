"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ButtonLoadingLabel, LoadingIllustration } from "@/components/ui/loading-illustration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { RunReviewButton } from "@/features/dashboard/components/run-review-button";
import { trpc } from "@/trpc/client";

type PrLinkPanelProps = {
  featureRequestId: string;
  linkedPullRequests: Array<{
    id: string;
    repoFullName: string;
    prNumber: number;
    title: string;
    status: string;
    updatedAt: string;
  }>;
  reviewConfigured?: boolean;
  onUpdated: () => Promise<void>;
};

function LinkablePrEmptyState({
  emptyReason,
  connectedRepos,
}: {
  emptyReason: "no_connected_repos" | "no_synced_prs" | "all_linked" | null | undefined;
  connectedRepos: string[];
}) {
  if (emptyReason === "no_connected_repos") {
    return (
      <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No repositories connected to this project</p>
        <p className="mt-1 text-xs">
          Connect repos under{" "}
          <Link href={`${DASHBOARD_BASE_PATH}/repositories`} className="text-primary underline">
            Repositories
          </Link>{" "}
          (they must belong to the same project as this feature).
        </p>
      </div>
    );
  }

  if (emptyReason === "no_synced_prs") {
    return (
      <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">No pull requests synced yet</p>
        <p className="mt-1 text-xs">
          Open a PR on GitHub in{" "}
          {connectedRepos.length > 0 ? connectedRepos.join(", ") : "a connected repo"}, then run{" "}
          <strong>Sync from GitHub</strong> on the{" "}
          <Link href={`${DASHBOARD_BASE_PATH}/pull-requests`} className="text-primary underline">
            Pull Requests
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  if (emptyReason === "all_linked") {
    return (
      <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">All synced PRs are already linked</p>
        <p className="mt-1 text-xs">
          Open a new PR in {connectedRepos.join(", ")} and sync, or unlink a PR from another
          feature first.
        </p>
      </div>
    );
  }

  return null;
}

export function PrLinkPanel({
  featureRequestId,
  linkedPullRequests,
  reviewConfigured = true,
  onUpdated,
}: PrLinkPanelProps) {
  const [selectedPrId, setSelectedPrId] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState(false);
  const autoSyncedRef = useRef(false);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.featureRequest.listLinkablePullRequests.useQuery(
    { featureRequestId },
    {
      // Live: pick up PRs synced via webhook, manual sync, or auto-sync.
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    },
  );

  const linkable = data?.pullRequests ?? [];
  const emptyReason = data?.emptyReason;
  const connectedRepos = data?.connectedRepos ?? [];

  const runSync = useCallback(
    async (options?: { silent?: boolean }) => {
      setIsSyncing(true);
      try {
        const response = await fetch("/api/github/sync-feature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ featureRequestId }),
        });

        const result = (await response.json().catch(() => null)) as {
          ok?: boolean;
          changed?: number;
          repos?: number;
          error?: string;
        } | null;

        if (!response.ok || !result?.ok) {
          throw new Error(result?.error ?? "Sync failed");
        }

        await utils.featureRequest.listLinkablePullRequests.invalidate({
          featureRequestId,
        });

        if (!options?.silent) {
          if ((result.repos ?? 0) === 0) {
            toast.info("No connected repos to sync for this feature's project.");
          } else if ((result.changed ?? 0) > 0) {
            toast.success(`Synced — ${result.changed} pull request(s) updated.`);
          } else {
            toast.success("Up to date with GitHub.");
          }
        }
      } catch (error) {
        if (!options?.silent) {
          toast.error(
            error instanceof Error ? error.message : "Failed to sync from GitHub",
          );
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [featureRequestId, utils],
  );

  // Auto-sync once on mount so freshly opened PRs appear without manual action.
  useEffect(() => {
    if (autoSyncedRef.current) return;
    autoSyncedRef.current = true;
    void runSync({ silent: true });
  }, [runSync]);

  const linkMutation = trpc.featureRequest.linkPullRequest.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.reviewQueued
          ? "Pull request linked — AI review started"
          : "Pull request linked",
      );
      setSelectedPrId("");
      await Promise.all([
        utils.featureRequest.listLinkablePullRequests.invalidate({
          featureRequestId,
        }),
        onUpdated(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  const unlinkMutation = trpc.featureRequest.unlinkPullRequest.useMutation({
    onSuccess: async () => {
      toast.success("Pull request unlinked");
      await Promise.all([
        utils.featureRequest.listLinkablePullRequests.invalidate({
          featureRequestId,
        }),
        onUpdated(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Pull requests</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSyncing}
          onClick={() => void runSync()}
          className="gap-1.5"
        >
          <RefreshCw className={isSyncing ? "size-3.5 animate-spin" : "size-3.5"} />
          {isSyncing ? "Syncing…" : "Sync from GitHub"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {linkedPullRequests.length > 0 ? (
          <div className="space-y-2">
            {linkedPullRequests.map((pr) => (
              <div
                key={pr.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate" title={`${pr.repoFullName} #${pr.prNumber} — ${pr.title}`}>
                  {pr.repoFullName} #{pr.prNumber} — {pr.title}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="capitalize text-xs text-muted-foreground">
                    {pr.status}
                  </span>
                  <RunReviewButton
                    pullRequestId={pr.id}
                    status={pr.status}
                    updatedAt={pr.updatedAt}
                    disabled={!reviewConfigured}
                    compact
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={unlinkMutation.isPending}
                    onClick={() =>
                      unlinkMutation.mutate({ pullRequestId: pr.id })
                    }
                  >
                    Unlink
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No pull requests linked yet.
          </p>
        )}

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Link pull request manually</p>
          <p className="text-xs text-muted-foreground">
            Auto-link via branch <code>feature/&lt;id&gt;</code> or title{" "}
            <code>[shipflow:&lt;id&gt;]</code>, or pick from connected repos:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {isLoading ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <LoadingIllustration variant="pull-requests" size="sm" />
                Loading open PRs…
              </span>
            ) : linkable.length > 0 ? (
              <>
                <Select
                  value={selectedPrId}
                  onValueChange={(value) => {
                    if (value) setSelectedPrId(value);
                  }}
                >
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Select a pull request" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkable.map((pr) => (
                      <SelectItem key={pr.id} value={pr.id}>
                        {pr.repoFullName} #{pr.prNumber} — {pr.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selectedPrId || linkMutation.isPending}
                  onClick={() =>
                    linkMutation.mutate({
                      featureRequestId,
                      pullRequestId: selectedPrId,
                    })
                  }
                >
                  {linkMutation.isPending ? (
                    <ButtonLoadingLabel>Linking…</ButtonLoadingLabel>
                  ) : (
                    "Link PR"
                  )}
                </Button>
              </>
            ) : isSyncing ? (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <LoadingIllustration variant="pull-requests" size="sm" />
                Checking GitHub for open pull requests…
              </span>
            ) : (
              <LinkablePrEmptyState
                emptyReason={emptyReason}
                connectedRepos={connectedRepos}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
