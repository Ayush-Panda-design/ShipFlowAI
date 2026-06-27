"use client";

import { Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  getStaleProcessingMs,
  isInFlightPrStatus,
} from "@repo/services/constants";
import { trpc } from "@/trpc/client";

type RunReviewButtonProps = {
  pullRequestId: string;
  status: string;
  updatedAt: string;
  disabled?: boolean;
  label?: string;
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
  label = "Run review",
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
    ? "Queuing…"
    : inFlight
      ? "In progress…"
      : status === "failed" || isStaleInFlight(status, updatedAt)
        ? "Retry review"
        : label;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || runReview.isPending || inFlight}
      onClick={() => runReview.mutate({ pullRequestId })}
    >
      <Play />
      {buttonLabel}
    </Button>
  );
}
