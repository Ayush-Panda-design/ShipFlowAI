import {
  CreditCard,
  FileText,
  GitPullRequest,
  History,
  Kanban,
  LayoutDashboard,
  Lightbulb,
  FolderGit2,
  Inbox,
  Settings,
  AppWindow,
  Building2,
  FolderKanban,
  ShieldCheck,
  Activity,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardRoute = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export const DASHBOARD_BASE_PATH = "/dashboard";
export const BILLING_PATH = `${DASHBOARD_BASE_PATH}/billing`;

export const dashboardRoutes: DashboardRoute[] = [
  {
    title: "Overview",
    href: DASHBOARD_BASE_PATH,
    icon: LayoutDashboard,
    description: "ShipFlow delivery pipeline at a glance",
  },
  {
    title: "Workspaces",
    href: `${DASHBOARD_BASE_PATH}/workspaces`,
    icon: Building2,
    description: "Manage workspaces and members",
  },
  {
    title: "Projects",
    href: `${DASHBOARD_BASE_PATH}/projects`,
    icon: FolderKanban,
  },
  {
    title: "Feature Requests",
    href: `${DASHBOARD_BASE_PATH}/feature-requests`,
    icon: Lightbulb,
    description: "Request → PRD → Tasks → Ship",
  },
  {
    title: "Customer Intake",
    href: `${DASHBOARD_BASE_PATH}/intake`,
    icon: Inbox,
    description: "Log customer requests from email, tickets, or calls",
  },
  {
    title: "PRD Editor",
    href: `${DASHBOARD_BASE_PATH}/prd`,
    icon: FileText,
    description: "View and edit generated PRDs",
  },
  {
    title: "Task Board",
    href: `${DASHBOARD_BASE_PATH}/tasks`,
    icon: Kanban,
  },
  {
    title: "Pull Requests",
    href: `${DASHBOARD_BASE_PATH}/pull-requests`,
    icon: GitPullRequest,
  },
  {
    title: "Review History",
    href: `${DASHBOARD_BASE_PATH}/review-history`,
    icon: History,
    description: "AI review results across PRs",
  },
  {
    title: "Review SLA",
    href: `${DASHBOARD_BASE_PATH}/review-sla`,
    icon: BarChart3,
    description: "Time-to-first-review by repo",
  },
  {
    title: "Activity",
    href: `${DASHBOARD_BASE_PATH}/activity`,
    icon: Activity,
    description: "Org-wide workflow audit trail",
  },
  {
    title: "Release Approval",
    href: `${DASHBOARD_BASE_PATH}/approvals`,
    icon: ShieldCheck,
    description: "Human gate for features ready to ship",
  },
  {
    title: "Repositories",
    href: `${DASHBOARD_BASE_PATH}/repositories`,
    icon: FolderGit2,
  },
  {
    title: "Billing",
    href: BILLING_PATH,
    icon: CreditCard,
  },
  {
    title: "GitHub App",
    href: `${DASHBOARD_BASE_PATH}/github-app`,
    icon: AppWindow,
  },
  {
    title: "Settings",
    href: `${DASHBOARD_BASE_PATH}/settings`,
    icon: Settings,
  },
];

export function getDashboardRoute(pathname: string) {
  return dashboardRoutes.find(
    (route) =>
      route.href === pathname ||
      (route.href !== DASHBOARD_BASE_PATH && pathname.startsWith(`${route.href}/`)),
  );
}

export const FEATURE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  clarifying: "Clarifying",
  prd_generating: "Generating PRD",
  awaiting_prd_approval: "Awaiting PRD Approval",
  prd_ready: "PRD Ready",
  planning: "Planning",
  awaiting_plan_approval: "Awaiting Plan Approval",
  in_development: "In Development",
  in_review: "AI Review",
  release_checking: "Release Readiness",
  fix_needed: "Fix Needed",
  awaiting_approval: "Awaiting Approval",
  shipped: "Shipped",
  rejected: "Rejected",
  duplicate: "Duplicate",
};
