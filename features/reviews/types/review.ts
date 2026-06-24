export const REVIEWABLE_PR_ACTIONS = [
  "opened",
  "synchronize",
  "reopened",
] as const;

export type ReviewablePullRequestAction =
  (typeof REVIEWABLE_PR_ACTIONS)[number];

export type PullRequestWebhookPayload = {
  action: string;
  installation?: {
    id: number;
  };
  repository: {
    full_name: string;
  };
  pull_request: {
    number: number;
    title: string;
    user: {
      login: string;
    } | null;
    head: {
      sha: string;
    };
    base: {
      ref: string;
    };
  };
};

export type ReviewStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "changes_requested"
  | "failed";
