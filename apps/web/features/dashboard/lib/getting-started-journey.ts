import type { LucideIcon } from "lucide-react";
import {
  FileText,
  FolderKanban,
  GitBranch,
  Lightbulb,
  Rocket,
  ScanSearch,
} from "lucide-react";

import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import type { JourneySignals } from "@/features/dashboard/server/journey-signals";

export type JourneyStageKey =
  | "connect"
  | "project"
  | "feature"
  | "plan"
  | "review"
  | "ship";

export type JourneyStageState = "done" | "current" | "upcoming";

export type JourneyStage = {
  key: JourneyStageKey;
  label: string;
  description: string;
  icon: LucideIcon;
  state: JourneyStageState;
  /** Where the sidebar should point the "Next" marker for this stage. */
  href: string;
};

export type JourneyNextAction = {
  stage: JourneyStageKey;
  title: string;
  hint: string;
  label: string;
  href: string;
  secondary?: { label: string; href: string };
};

export type GettingStartedJourney = {
  stages: JourneyStage[];
  currentIndex: number;
  doneCount: number;
  isComplete: boolean;
  next: JourneyNextAction | null;
};

const base = DASHBOARD_BASE_PATH;

/** Pure: derive the new-user journey from real workspace signals. */
export function getGettingStartedJourney(s: JourneySignals): GettingStartedJourney {
  const connected = s.githubSignedIn && s.githubAppConnected && s.connectedRepos > 0;

  const connectHref = !s.githubSignedIn
    ? "/sign-in"
    : !s.githubAppConnected
      ? `${base}/github-app`
      : `${base}/repositories`;

  const defs: Array<
    Omit<JourneyStage, "state"> & { done: boolean; next: JourneyNextAction }
  > = [
    {
      key: "connect",
      label: "Connect",
      description: "GitHub & repositories",
      icon: GitBranch,
      href: !s.githubSignedIn || !s.githubAppConnected ? `${base}/github-app` : `${base}/repositories`,
      done: connected,
      next: {
        stage: "connect",
        title: !s.githubSignedIn
          ? "Sign in with GitHub"
          : !s.githubAppConnected
            ? "Install the GitHub App"
            : "Connect a repository",
        hint: "ShipFlow reads your repos to review pull requests against your plan.",
        label: !s.githubSignedIn
          ? "Sign in with GitHub"
          : !s.githubAppConnected
            ? "Set up GitHub App"
            : "Connect repositories",
        href: connectHref,
        secondary: { label: "Plan first, connect later", href: `${base}/projects` },
      },
    },
    {
      key: "project",
      label: "Project",
      description: "Organise your work",
      icon: FolderKanban,
      href: `${base}/projects`,
      done: s.projectCount > 0,
      next: {
        stage: "project",
        title: "Create your first project",
        hint: "Projects group features and repositories under one product or area.",
        label: "Create a project",
        href: `${base}/projects`,
      },
    },
    {
      key: "feature",
      label: "Feature",
      description: "Capture an idea",
      icon: Lightbulb,
      href: `${base}/feature-requests`,
      done: s.featureCount > 0,
      next: {
        stage: "feature",
        title: "Log your first feature request",
        hint: "Describe an idea in plain words. AI clarifies it and turns it into requirements.",
        label: "New feature request",
        href: `${base}/feature-requests`,
      },
    },
    {
      key: "plan",
      label: "Plan",
      description: "Requirements & tasks",
      icon: FileText,
      href: `${base}/prd`,
      done: s.taskCount > 0,
      next: {
        stage: "plan",
        title: "Turn the idea into requirements and tasks",
        hint: "Open a feature request, approve the requirements, then generate the task plan.",
        label: "Open feature requests",
        href: `${base}/feature-requests`,
      },
    },
    {
      key: "review",
      label: "Review",
      description: "AI checks the code",
      icon: ScanSearch,
      href: `${base}/pull-requests`,
      done: s.reviewCount > 0,
      next: {
        stage: "review",
        title: "Get your first AI code review",
        hint: "Open a pull request on a connected repo. ShipFlow reviews it against your plan.",
        label: "View pull requests",
        href: `${base}/pull-requests`,
      },
    },
    {
      key: "ship",
      label: "Ship",
      description: "Approve & release",
      icon: Rocket,
      href: `${base}/approvals`,
      done: s.shippedCount > 0,
      next: {
        stage: "ship",
        title:
          s.awaitingApprovalCount > 0
            ? `Approve ${s.awaitingApprovalCount} release${s.awaitingApprovalCount > 1 ? "s" : ""}`
            : "Ship your first feature",
        hint: "A human sign-off is the last gate before a feature is marked shipped.",
        label: s.awaitingApprovalCount > 0 ? "Review & approve" : "Open release approval",
        href: `${base}/approvals`,
      },
    },
  ];

  const currentIndex = defs.findIndex((d) => !d.done);
  const isComplete = currentIndex === -1;

  const stages: JourneyStage[] = defs.map((d, index) => ({
    key: d.key,
    label: d.label,
    description: d.description,
    icon: d.icon,
    href: d.href,
    state: d.done ? "done" : index === currentIndex ? "current" : "upcoming",
  }));

  return {
    stages,
    currentIndex,
    doneCount: defs.filter((d) => d.done).length,
    isComplete,
    next: isComplete ? null : defs[currentIndex]!.next,
  };
}
