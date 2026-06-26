import type { ReviewFinding } from "@/features/reviews/types/structured-review";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type AiReviewRecord = {
  id: string;
  summary: string;
  findings: string;
  blockingCount: number;
  nonBlockingCount: number;
  prdAlignment: string | null;
  createdAt: Date;
  pullRequest: {
    repoFullName: string;
    prNumber: number;
    title: string;
  };
};

function parseFindings(raw: string): ReviewFinding[] {
  try {
    const parsed = JSON.parse(raw) as ReviewFinding[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function FindingBadge({ severity }: { severity: ReviewFinding["severity"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        severity === "blocking"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      )}
    >
      {severity === "blocking" ? "Blocking" : "Non-blocking"}
    </Badge>
  );
}

export function AiReviewPanel({ reviews }: { reviews: AiReviewRecord[] }) {
  if (reviews.length === 0) {
    return null;
  }

  const latest = reviews[0];
  const findings = parseFindings(latest.findings);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">AI review</CardTitle>
          <div className="flex gap-2 text-xs">
            <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">
              {latest.blockingCount} blocking
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {latest.nonBlockingCount} non-blocking
            </Badge>
          </div>
        </div>
        {latest.pullRequest && (
          <p className="text-xs text-muted-foreground">
            {latest.pullRequest.repoFullName} #{latest.pullRequest.prNumber} ·{" "}
            {latest.pullRequest.title}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Summary
          </p>
          <p className="whitespace-pre-wrap">{latest.summary}</p>
        </div>

        {latest.prdAlignment && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              PRD alignment
            </p>
            <p className="whitespace-pre-wrap">{latest.prdAlignment}</p>
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
              </div>
            ))}
          </div>
        )}

        {reviews.length > 1 && (
          <p className="text-xs text-muted-foreground">
            {reviews.length - 1} earlier review{reviews.length > 2 ? "s" : ""} on
            file
          </p>
        )}
      </CardContent>
    </Card>
  );
}
