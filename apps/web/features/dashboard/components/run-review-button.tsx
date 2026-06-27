"use client";

import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getStaleProcessingMs,
  isInFlightPrStatus,
} from "@repo/services/constants";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";

type RunReviewButtonProps = {
  pullRequestId: string;
  status: string;
  updatedAt: string;
  disabled?: boolean;
  label?: string;
  className?: string;
};

function isStaleInFlight(status: string, updatedAt: string) {
  if (!isInFlightPrStatus(status)) {
    return false;
  }

  return Date.now() - new Date(updatedAt).getTime() >= getStaleProcessingMs();
}

export function RunReviewButton({
  pullRequestId,
  status,
  updatedAt,
  disabled = false,
  label = "Review",
  className,
}: RunReviewButtonProps) {
  const utils = trpc.useUtils();
  const inFlight = isInFlightPrStatus(status) && !isStaleInFlight(status, updatedAt);

  const runReview = trpc.review.runReview.useMutation({
    onSuccess: async (result) => {
      toast.success(result.message);
      await Promise.all([
        utils.review.list.invalidate(),
        utils.review.history.invalidate(),
        utils.review.getStatus.invalidate({ pullRequestId }),
        utils.featureRequest.get.invalidate(),
      ]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const buttonLabel = runReview.isPending
    ? "Queuing"
    : inFlight
      ? "Running"
      : status === "failed" || isStaleInFlight(status, updatedAt)
        ? "Retry"
        : label;

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      disabled={disabled || runReview.isPending || inFlight}
      onClick={() => runReview.mutate({ pullRequestId })}
      className={cn("w-full", className)}
    >
      {inFlight || runReview.isPending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Play />
      )}
      {buttonLabel}
    </Button>
  );
}
