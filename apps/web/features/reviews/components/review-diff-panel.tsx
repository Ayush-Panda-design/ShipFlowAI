"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import {
  confidenceLabel,
  diffReviewFindings,
  parseFindings,
  type ReviewFinding,
} from "@/features/reviews/types/structured-review";

type ReviewSnapshot = {
  id: string;
  createdAt: Date;
  blockingCount: number;
  confidenceScore: number | null;
  findings: string;
};

function FindingList({
  findings,
  emptyLabel,
}: {
  findings: ReviewFinding[];
  emptyLabel: string;
}) {
  if (findings.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="space-y-2">
      {findings.map((finding) => (
        <li key={finding.id} className="rounded border p-2 text-xs">
          <span className="font-medium">{finding.title}</span>
          {finding.filePath ? (
            <span className="text-muted-foreground"> · {finding.filePath}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ReviewDiffPanel({ reviews }: { reviews: ReviewSnapshot[] }) {
  if (reviews.length < 2) {
    return null;
  }

  const [olderId, setOlderId] = useState(reviews[1]?.id ?? "");
  const [newerId, setNewerId] = useState(reviews[0]?.id ?? "");

  const older = reviews.find((review) => review.id === olderId) ?? reviews[1]!;
  const newer = reviews.find((review) => review.id === newerId) ?? reviews[0]!;

  const diff = diffReviewFindings(
    parseFindings(older.findings),
    parseFindings(newer.findings),
  );

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        Review diff
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1 text-xs">
          Earlier
          <select
            className="rounded border bg-background px-2 py-1"
            value={olderId}
            onChange={(event) => setOlderId(event.target.value)}
          >
            {reviews.map((review) => (
              <option key={review.id} value={review.id}>
                {review.createdAt.toLocaleString()} ({review.blockingCount}{" "}
                blocking)
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1 text-xs">
          Later
          <select
            className="rounded border bg-background px-2 py-1"
            value={newerId}
            onChange={(event) => setNewerId(event.target.value)}
          >
            {reviews.map((review) => (
              <option key={review.id} value={review.id}>
                {review.createdAt.toLocaleString()} ({review.blockingCount}{" "}
                blocking)
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {typeof newer.confidenceScore === "number" && (
          <Badge variant="outline">
            Confidence {newer.confidenceScore}/100 —{" "}
            {confidenceLabel(newer.confidenceScore)}
          </Badge>
        )}
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700">
          {diff.resolved.length} resolved
        </Badge>
        <Badge variant="outline" className="border-destructive/40 text-destructive">
          {diff.newIssues.length} new
        </Badge>
        <Badge variant="outline">{diff.unchanged.length} unchanged</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-medium text-emerald-700">Resolved</p>
          <FindingList findings={diff.resolved} emptyLabel="None" />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-destructive">New issues</p>
          <FindingList findings={diff.newIssues} emptyLabel="None" />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Still open
          </p>
          <FindingList findings={diff.unchanged} emptyLabel="None" />
        </div>
      </div>
    </div>
  );
}
