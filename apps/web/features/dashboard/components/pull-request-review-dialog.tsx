"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

import { AutoHideScroll } from "@/components/ui/auto-hide-scroll";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReviewCommentBody } from "@/features/reviews/components/review-comment-body";
import { cn } from "@/lib/utils";

export type PullRequestReviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  repoFullName: string;
  prNumber: number;
  reviewComment: string | null;
  status: string;
  isLoading?: boolean;
};

function githubPullRequestUrl(repoFullName: string, prNumber: number) {
  return `https://github.com/${repoFullName}/pull/${prNumber}`;
}

function isReviewContent(comment: string | null) {
  if (!comment) {
    return false;
  }

  if (comment.startsWith("Review in progress:") || comment.startsWith("Review failed:")) {
    return false;
  }

  return (
    comment.includes("ShipFlow AI Review") ||
    comment.includes("**Summary:**") ||
    comment.includes("**Findings:**")
  );
}

export function PullRequestReviewDialog({
  open,
  onOpenChange,
  title,
  repoFullName,
  prNumber,
  reviewComment,
  status,
  isLoading = false,
}: PullRequestReviewDialogProps) {
  const githubUrl = githubPullRequestUrl(repoFullName, prNumber);
  const hasReview = isReviewContent(reviewComment);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="text-base leading-snug">
            #{prNumber} · {title}
          </DialogTitle>
          <DialogDescription className="truncate">
            {repoFullName}
            {hasReview ? null : ` · ${status}`}
          </DialogDescription>
        </DialogHeader>

        <AutoHideScroll className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading review…
            </div>
          ) : hasReview && reviewComment ? (
            <ReviewCommentBody markdown={reviewComment} />
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center">
              <p className="text-sm font-medium">No review notes yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Run a review from the table, or open this PR on GitHub to see
                comments there.
              </p>
            </div>
          )}
        </AutoHideScroll>

        <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-between">
          <p className="hidden text-xs text-muted-foreground sm:block">
            Full thread and inline comments live on GitHub
          </p>
          <Button
            render={
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" />
            }
            className="gap-2 sm:ml-auto"
          >
            View on GitHub
            <ExternalLink className="size-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function pullRequestHasReviewNotes(
  reviewComment: string | null,
  status: string,
) {
  if (isReviewContent(reviewComment)) {
    return true;
  }

  return (
    (status === "reviewed" || status === "completed") &&
    Boolean(reviewComment && reviewComment.length > 40)
  );
}

export function ClickableReviewSection({
  className,
  onClick,
  title,
  children,
}: {
  className?: string;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title ?? "View AI review details"}
      onClick={onClick}
      className={cn(
        "min-w-0 rounded-md text-left transition-colors",
        "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** @deprecated Use ClickableReviewSection */
export const PullRequestChangeCell = ClickableReviewSection;
