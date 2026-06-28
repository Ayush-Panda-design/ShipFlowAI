"use client";

import { formatDistanceToNow } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/ui/loading-state";
import { AutoHideScroll } from "@/components/ui/auto-hide-scroll";
import { ClickableReviewSection } from "@/features/dashboard/components/pull-request-review-dialog";
import type { PullRequestReviewTarget } from "@/features/dashboard/components/use-pull-request-review-dialog";
import { trpc } from "@/trpc/client";

type RepoPullRequestsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repoFullName: string | null;
  onSelectPullRequest: (target: PullRequestReviewTarget) => void;
};

export function RepoPullRequestsDialog({
  open,
  onOpenChange,
  repoFullName,
  onSelectPullRequest,
}: RepoPullRequestsDialogProps) {
  const { data, isLoading } = trpc.review.list.useQuery(undefined, {
    enabled: open && Boolean(repoFullName),
  });

  const pullRequests =
    data?.pullRequests.filter((pr) => pr.repoFullName === repoFullName) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,640px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="text-base">Pull requests</DialogTitle>
          <DialogDescription className="truncate">{repoFullName}</DialogDescription>
        </DialogHeader>

        <AutoHideScroll className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <LoadingState
              label="Loading pull requests"
              variant="pull-requests"
              className="py-8"
            />
          ) : pullRequests.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No pull requests synced for this repository yet. Sync from the Pull
              Requests page to import open PRs.
            </p>
          ) : (
            <ul className="space-y-2">
              {pullRequests.map((pr) => (
                <li key={pr.id}>
                  <ClickableReviewSection
                    className="w-full rounded-lg border border-border/60 p-3"
                    onClick={() => {
                      onSelectPullRequest({
                        pullRequestId: pr.id,
                        title: pr.title,
                        repoFullName: pr.repoFullName,
                        prNumber: pr.prNumber,
                        reviewComment: pr.reviewComment,
                        status: pr.status,
                      });
                      onOpenChange(false);
                    }}
                  >
                    <p className="truncate text-sm font-medium">#{pr.prNumber} · {pr.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {pr.status.replace(/_/g, " ")} ·{" "}
                      {formatDistanceToNow(new Date(pr.updatedAt), { addSuffix: true })}
                    </p>
                  </ClickableReviewSection>
                </li>
              ))}
            </ul>
          )}
        </AutoHideScroll>
      </DialogContent>
    </Dialog>
  );
}
