export type MilestoneKey =
  | "request"
  | "clarify"
  | "prd"
  | "plan"
  | "build"
  | "review"
  | "ship";

export type MilestoneState = "done" | "current" | "upcoming";

export type JourneyMilestone = {
  key: MilestoneKey;
  label: string;
  description: string;
  state: MilestoneState;
};

export type NextAction = {
  /** Short imperative headline of what to do now. */
  title: string;
  /** One-line guidance. */
  hint: string;
  /** Whether an AI/background job is currently running for this status. */
  inFlight: boolean;
  /** Tone used for accent styling. */
  tone: "info" | "action" | "running" | "success" | "blocked";
};

export type WorkflowJourney = {
  milestones: JourneyMilestone[];
  currentIndex: number;
  percent: number;
  nextAction: NextAction;
  terminal: "rejected" | "duplicate" | "shipped" | null;
};

const MILESTONE_DEFS: Array<{
  key: MilestoneKey;
  label: string;
  description: string;
}> = [
  { key: "request", label: "Request", description: "Capture the idea" },
  { key: "clarify", label: "Clarify", description: "AI Q&A on scope" },
  { key: "prd", label: "PRD", description: "Spec the work" },
  { key: "plan", label: "Plan", description: "Tasks & approval" },
  { key: "build", label: "Build", description: "Write code & open PR" },
  { key: "review", label: "Review", description: "AI checks the code" },
  { key: "ship", label: "Ship", description: "Approve & release" },
];

const STATUS_TO_INDEX: Record<string, number> = {
  draft: 0,
  clarifying: 1,
  prd_generating: 2,
  awaiting_prd_approval: 2,
  prd_ready: 2,
  planning: 3,
  awaiting_plan_approval: 3,
  in_development: 4,
  in_review: 5,
  fix_needed: 5,
  release_checking: 6,
  awaiting_approval: 6,
  shipped: 7,
};

const NEXT_ACTIONS: Record<string, NextAction> = {
  draft: {
    title: "Start the delivery loop",
    hint: "Run AI Clarify to refine the idea, or jump straight to Generate PRD.",
    inFlight: false,
    tone: "action",
  },
  clarifying: {
    title: "AI is asking questions",
    hint: "Reply in the Clarifications box below, then Generate the PRD.",
    inFlight: true,
    tone: "running",
  },
  prd_generating: {
    title: "Writing the PRD",
    hint: "The AI is drafting your product requirements — this takes a few seconds.",
    inFlight: true,
    tone: "running",
  },
  awaiting_prd_approval: {
    title: "Approve the PRD",
    hint: "Review the generated spec below, then click Approve PRD to unlock tasks.",
    inFlight: false,
    tone: "action",
  },
  prd_ready: {
    title: "Generate engineering tasks",
    hint: "PRD approved. Click Generate tasks to break it into work items.",
    inFlight: false,
    tone: "action",
  },
  planning: {
    title: "Breaking PRD into tasks",
    hint: "The AI is generating the engineering task list.",
    inFlight: true,
    tone: "running",
  },
  awaiting_plan_approval: {
    title: "Approve the plan",
    hint: "Review the task breakdown and approve it to start development.",
    inFlight: false,
    tone: "action",
  },
  in_development: {
    title: "Build it & link a PR",
    hint: "Write the code, open a pull request on GitHub, then link it in the Pull requests panel.",
    inFlight: false,
    tone: "info",
  },
  in_review: {
    title: "AI is reviewing the code",
    hint: "ShipFlow is checking the linked PR against the PRD and tasks.",
    inFlight: true,
    tone: "running",
  },
  fix_needed: {
    title: "Fix blocking issues",
    hint: "The AI found blocking issues. Address them, push, and re-run the review.",
    inFlight: false,
    tone: "blocked",
  },
  release_checking: {
    title: "Checking release readiness",
    hint: "The AI is assessing whether this is safe to ship.",
    inFlight: true,
    tone: "running",
  },
  awaiting_approval: {
    title: "Approve the release",
    hint: "No blocking issues. A human can approve or reject the release below.",
    inFlight: false,
    tone: "action",
  },
  shipped: {
    title: "Shipped",
    hint: "This feature has been approved and released. Nice work!",
    inFlight: false,
    tone: "success",
  },
  rejected: {
    title: "Release rejected",
    hint: "A reviewer rejected this feature at the release gate. See the audit trail below.",
    inFlight: false,
    tone: "blocked",
  },
  duplicate: {
    title: "Marked as duplicate",
    hint: "This request looks similar to an existing feature. Review before continuing.",
    inFlight: false,
    tone: "info",
  },
};

const DEFAULT_NEXT_ACTION: NextAction = {
  title: "In progress",
  hint: "Continue working through the delivery loop.",
  inFlight: false,
  tone: "info",
};

export function getWorkflowJourney(status: string): WorkflowJourney {
  const terminal =
    status === "rejected"
      ? "rejected"
      : status === "duplicate"
        ? "duplicate"
        : status === "shipped"
          ? "shipped"
          : null;

  const rawIndex = STATUS_TO_INDEX[status] ?? 0;
  // shipped maps to 7 (one past the last milestone) => all done.
  const currentIndex = Math.min(rawIndex, MILESTONE_DEFS.length);

  const milestones: JourneyMilestone[] = MILESTONE_DEFS.map((def, index) => {
    let state: MilestoneState;
    if (index < currentIndex) {
      state = "done";
    } else if (index === currentIndex) {
      state = "current";
    } else {
      state = "upcoming";
    }

    // Terminal "shipped" => every milestone done.
    if (terminal === "shipped") {
      state = "done";
    }

    return { ...def, state };
  });

  const percent =
    terminal === "shipped"
      ? 100
      : Math.round((currentIndex / MILESTONE_DEFS.length) * 100);

  return {
    milestones,
    currentIndex,
    percent,
    nextAction: NEXT_ACTIONS[status] ?? DEFAULT_NEXT_ACTION,
    terminal,
  };
}
