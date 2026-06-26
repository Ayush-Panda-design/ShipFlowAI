export type ReviewFindingSeverity = "blocking" | "non_blocking";

export type ReviewFinding = {
  id: string;
  severity: ReviewFindingSeverity;
  category: string;
  title: string;
  description: string;
  filePath?: string;
};

export type StructuredReview = {
  summary: string;
  prdAlignment: string;
  findings: ReviewFinding[];
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
    (finding) => finding.severity === "blocking"
  ).length;
  const nonBlockingCount = findings.filter(
    (finding) => finding.severity === "non_blocking"
  ).length;

  return { blockingCount, nonBlockingCount };
}
