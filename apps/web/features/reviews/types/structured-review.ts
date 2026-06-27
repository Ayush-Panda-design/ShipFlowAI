export type ReviewFindingSeverity = "blocking" | "non_blocking";

export type ReviewFinding = {
  id: string;
  severity: ReviewFindingSeverity;
  category: string;
  title: string;
  description: string;
  filePath?: string;
  /** Concrete code fix for blocking issues — patch snippet or replacement code */
  codeSuggestion?: string;
};

export type StructuredReview = {
  summary: string;
  prdAlignment: string;
  findings: ReviewFinding[];
  confidenceScore?: number;
};

export type ReviewContext = {
  featureRequestId: string | null;
  featureTitle: string | null;
  prd: {
    problemStatement: string;
    goals: string;
    nonGoals: string;
    userStories: string;
    acceptanceCriteria: string;
    edgeCases: string;
  } | null;
  tasks: Array<{ title: string; description: string | null; status: string }>;
};

export function countFindings(findings: ReviewFinding[]) {
  const blockingCount = findings.filter(
    (finding) => finding.severity === "blocking",
  ).length;
  const nonBlockingCount = findings.filter(
    (finding) => finding.severity === "non_blocking",
  ).length;

  return { blockingCount, nonBlockingCount };
}

/** 0–100: how close the PR is to passing PRD / review (higher = closer to ship) */
export function computeConfidenceScore(
  review: Pick<StructuredReview, "prdAlignment" | "findings">,
  counts: { blockingCount: number; nonBlockingCount: number },
): number {
  let score = 100;
  score -= counts.blockingCount * 18;
  score -= counts.nonBlockingCount * 4;

  const alignment = review.prdAlignment.toLowerCase();
  if (
    alignment.includes("not aligned") ||
    alignment.includes("does not meet") ||
    alignment.includes("fails to") ||
    alignment.includes("missing critical")
  ) {
    score -= 15;
  } else if (
    alignment.includes("fully aligned") ||
    alignment.includes("meets all") ||
    alignment.includes("satisfies")
  ) {
    score += 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function confidenceLabel(score: number) {
  if (score >= 85) return "Ready to ship";
  if (score >= 65) return "Close — few fixes left";
  if (score >= 40) return "Needs work";
  return "Far from passing";
}

export function parseFindings(raw: string): ReviewFinding[] {
  try {
    const parsed = JSON.parse(raw) as ReviewFinding[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function diffReviewFindings(
  previous: ReviewFinding[],
  current: ReviewFinding[],
) {
  const key = (finding: ReviewFinding) =>
    `${finding.severity}:${finding.title}:${finding.filePath ?? ""}`;

  const prevKeys = new Set(previous.map(key));
  const currKeys = new Set(current.map(key));

  return {
    resolved: previous.filter((finding) => !currKeys.has(key(finding))),
    newIssues: current.filter((finding) => !prevKeys.has(key(finding))),
    unchanged: current.filter((finding) => prevKeys.has(key(finding))),
  };
}
