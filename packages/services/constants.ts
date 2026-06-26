export const FEATURE_STATUSES = [
  "draft",
  "clarifying",
  "prd_generating",
  "prd_ready",
  "planning",
  "in_development",
  "in_review",
  "fix_needed",
  "awaiting_approval",
  "shipped",
  "rejected",
  "duplicate",
] as const;

export type FeatureStatus = (typeof FEATURE_STATUSES)[number];

export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const AI_CREDIT_COSTS = {
  clarify: 1,
  prd: 2,
  tasks: 2,
  review: 3,
} as const;

/** Free-plan quota. High in dev for localhost testing; set to 10 before production polish. */
export function isDevCreditsMode() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.INNGEST_DEV === "1" ||
    process.env.SHIPFLOW_DEV_AI_CREDITS === "1"
  );
}

export function getFreePlanAiCredits() {
  return isDevCreditsMode() ? 9_999 : 10;
}

/** @deprecated use getFreePlanAiCredits() — evaluated at call time for correct env */
export const FREE_PLAN_AI_CREDITS = getFreePlanAiCredits();

export const FREE_PLAN_REPO_LIMIT = 2;

export type AiCreditAction = keyof typeof AI_CREDIT_COSTS;

export const IN_FLIGHT_FEATURE_STATUSES = [
  "clarifying",
  "prd_generating",
  "planning",
  "in_review",
] as const;

export function isInFlightFeatureStatus(status: string) {
  return (IN_FLIGHT_FEATURE_STATUSES as readonly string[]).includes(status);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
