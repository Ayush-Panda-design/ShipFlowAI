"use client";

import { useState } from "react";

import type { ReviewFinding } from "@/features/reviews/types/structured-review";
import { ReviewDiffPanel } from "@/features/reviews/components/review-diff-panel";
import {
  confidenceLabel,
  parseFindings,
} from "@/features/reviews/types/structured-review";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AiReviewRecord = {
  id: string;
  summary: string;
  findings: string;
  blockingCount: number;
  nonBlockingCount: number;
  confidenceScore: number | null;
  prdAlignment: string | null;
  createdAt: Date;
  pullRequest: {
    repoFullName: string;
    prNumber: number;
    title: string;
  };
};

function FindingBadge({ severity }: { severity: ReviewFinding["severity"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        severity === "blocking"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      )}
    >
      {severity === "blocking" ? "Blocking" : "Non-blocking"}
    </Badge>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 85
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
      : score >= 65
        ? "border-sky-500/40 bg-sky-500/10 text-sky-700"
        : score >= 40
          ? "border-amber-500/40 bg-amber-500/10 text-amber-700"
          : "border-destructive/40 bg-destructive/10 text-destructive";

  return (
    <Badge variant="outline" className={cn("font-medium", color)}>
      {score}/100 — {confidenceLabel(score)}
    </Badge>
  );
}

export function AiReviewPanel({ reviews }: { reviews: AiReviewRecord[] }) {
  const [selectedId, setSelectedId] = useState(reviews[0]?.id ?? "");

  if (reviews.length === 0) {
    return null;
  }

  const selected =
    reviews.find((review) => review.id === selectedId) ?? reviews[0]!;
  const findings = parseFindings(selected.findings);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">AI review</CardTitle>
          <div className="flex flex-wrap gap-2 text-xs">
            {typeof selected.confidenceScore === "number" && (
              <ConfidenceBadge score={selected.confidenceScore} />
            )}
            <Badge
              variant="outline"
              className="border-destructive/40 bg-destructive/10 text-destructive"
            >
              {selected.blockingCount} blocking
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              {selected.nonBlockingCount} non-blocking
            </Badge>
          </div>
        </div>
        {selected.pullRequest && (
          <p className="text-xs text-muted-foreground">
            {selected.pullRequest.repoFullName} #{selected.pullRequest.prNumber} ·{" "}
            {selected.pullRequest.title}
          </p>
        )}
        {reviews.length > 1 && (
          <select
            className="mt-2 rounded border bg-background px-2 py-1 text-xs"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {reviews.map((review) => (
              <option key={review.id} value={review.id}>
                {review.createdAt.toLocaleString()} — {review.blockingCount}{" "}
                blocking
                {typeof review.confidenceScore === "number"
                  ? ` · ${review.confidenceScore}%`
                  : ""}
              </option>
            ))}
          </select>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ReviewDiffPanel reviews={reviews} />

        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Summary
          </p>
          <p className="whitespace-pre-wrap">{selected.summary}</p>
        </div>

        {selected.prdAlignment && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              PRD alignment
            </p>
            <p className="whitespace-pre-wrap">{selected.prdAlignment}</p>
          </div>
        )}

        {findings.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Findings
            </p>
            {findings.map((finding) => (
              <div key={finding.id} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <FindingBadge severity={finding.severity} />
                  <span className="font-medium">{finding.title}</span>
                  {finding.filePath && (
                    <span className="text-xs text-muted-foreground">
                      {finding.filePath}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{finding.category}</p>
                <p className="mt-1 whitespace-pre-wrap">{finding.description}</p>
                {finding.codeSuggestion && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Suggested fix
                    </p>
                    <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                      {finding.codeSuggestion}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
