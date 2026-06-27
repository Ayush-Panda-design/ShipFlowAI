export const FEATURE_STATUSES = [
  "draft",
  "clarifying",
  "prd_generating",
  "awaiting_prd_approval",
  "prd_ready",
  "planning",
  "awaiting_plan_approval",
  "in_development",
  "in_review",
  "release_checking",
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
  codegen: 5,
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

/** Plan approvals required before development (capped by member count) */
export const PLAN_APPROVALS_REQUIRED = 2;

export type AiCreditAction = keyof typeof AI_CREDIT_COSTS;

export const IN_FLIGHT_FEATURE_STATUSES = [
  "clarifying",
  "prd_generating",
  "planning",
  "in_review",
  "release_checking",
] as const;

export function isInFlightFeatureStatus(status: string) {
  return (IN_FLIGHT_FEATURE_STATUSES as readonly string[]).includes(status);
}

export const IN_FLIGHT_PR_STATUSES = ["pending", "processing"] as const;

export function isInFlightPrStatus(status: string) {
  return (IN_FLIGHT_PR_STATUSES as readonly string[]).includes(status);
}

/** How long before a stuck "processing" PR can be re-queued */
export function getStaleProcessingMs() {
  return isDevCreditsMode() ? 2 * 60 * 1000 : 3 * 60 * 1000;
}

/** Max non-blocking findings posted per review (blocking always shown) */
export const REVIEW_NON_BLOCKING_BUDGET = 8;

/** PR size thresholds */
export const PR_SIZE_WARN_FILES = 30;
export const PR_SIZE_WARN_LINES = 2000;
export const PR_SIZE_CRITICAL_FILES = 80;
export const PR_SIZE_CRITICAL_LINES = 5000;

/** Stale PR threshold (hours without update) */
export const STALE_PR_HOURS = 48;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
