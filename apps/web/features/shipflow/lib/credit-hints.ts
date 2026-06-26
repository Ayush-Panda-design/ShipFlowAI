import { AI_CREDIT_COSTS } from "@repo/services/constants";

type CreditHintOptions = {
  cost: number;
  credits: number;
  inFlight: boolean;
  billingHref?: string;
};

export function getCreditHint({
  cost,
  credits,
  inFlight,
  billingHref = "/dashboard/billing",
}: CreditHintOptions) {
  if (inFlight) {
    return "Wait for the current AI job to finish.";
  }

  if (credits < cost) {
    return `Need ${cost} AI credits (you have ${credits}). Go to Billing (${billingHref}) to upgrade.`;
  }

  return `Uses ${cost} AI credit${cost === 1 ? "" : "s"}.`;
}

const MIN_AI_ACTION_COST = Math.min(
  AI_CREDIT_COSTS.clarify,
  AI_CREDIT_COSTS.prd,
  AI_CREDIT_COSTS.tasks,
);

export function getLowCreditsBannerMessage(
  credits: number,
  hasLinkedPullRequests: boolean,
) {
  if (credits < MIN_AI_ACTION_COST) {
    return {
      show: true,
      message:
        credits === 0
          ? "You have no AI credits left. AI actions are disabled until you upgrade."
          : `You need at least ${MIN_AI_ACTION_COST} AI credits for clarify, PRD, or tasks (you have ${credits}).`,
    };
  }

  if (hasLinkedPullRequests && credits < AI_CREDIT_COSTS.review) {
    return {
      show: true,
      message: `You need at least ${AI_CREDIT_COSTS.review} AI credits to run a review (you have ${credits}).`,
    };
  }

  return { show: false, message: "" };
}
