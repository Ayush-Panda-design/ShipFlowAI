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
  CircleHelp,
  PackageCheck,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DashboardRoute = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export type DashboardNavGroup = {
  id: string;
  label: string;
  hint?: string;
  routes: DashboardRoute[];
};

export const DASHBOARD_BASE_PATH = "/dashboard";
export const BILLING_PATH = `${DASHBOARD_BASE_PATH}/billing`;

const overviewRoute: DashboardRoute = {
  title: "Overview",
  href: DASHBOARD_BASE_PATH,
  icon: LayoutDashboard,
  description: "ShipFlow delivery pipeline at a glance",
};

export const dashboardNavGroups: DashboardNavGroup[] = [
  {
    id: "home",
    label: "Home",
    routes: [overviewRoute],
  },
  {
    id: "planning",
    label: "Plan & deliver",
    hint: "Ideas → requirements → tasks",
    routes: [
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
        description: "Request → requirements → tasks → ship",
      },
      {
        title: "Customer Intake",
        href: `${DASHBOARD_BASE_PATH}/intake`,
        icon: Inbox,
        description: "Log customer requests from email, tickets, or calls",
      },
      {
        title: "Requirements",
        href: `${DASHBOARD_BASE_PATH}/prd`,
        icon: FileText,
        description: "View and edit product requirements",
      },
      {
        title: "Task Board",
        href: `${DASHBOARD_BASE_PATH}/tasks`,
        icon: Kanban,
      },
    ],
  },
  {
    id: "review",
    label: "Code & review",
    hint: "GitHub PRs & AI",
    routes: [
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
        title: "Review speed",
        href: `${DASHBOARD_BASE_PATH}/review-sla`,
        icon: BarChart3,
        description: "How quickly pull requests get a first AI review",
      },
      {
        title: "Repositories",
        href: `${DASHBOARD_BASE_PATH}/repositories`,
        icon: FolderGit2,
      },
      {
        title: "GitHub App",
        href: `${DASHBOARD_BASE_PATH}/github-app`,
        icon: AppWindow,
      },
    ],
  },
  {
    id: "ship",
    label: "Ship & track",
    hint: "Approvals & audit",
    routes: [
      {
        title: "Release Approval",
        href: `${DASHBOARD_BASE_PATH}/approvals`,
        icon: ShieldCheck,
        description: "Human gate for features ready to ship",
      },
      {
        title: "Shipped",
        href: `${DASHBOARD_BASE_PATH}/shipped`,
        icon: PackageCheck,
        description: "Features approved and marked as shipped",
      },
      {
        title: "Activity",
        href: `${DASHBOARD_BASE_PATH}/activity`,
        icon: Activity,
        description: "Org-wide workflow audit trail",
      },
    ],
  },
  {
    id: "account",
    label: "Workspace",
    routes: [
      {
        title: "Billing",
        href: BILLING_PATH,
        icon: CreditCard,
      },
      {
        title: "Settings",
        href: `${DASHBOARD_BASE_PATH}/settings`,
        icon: Settings,
      },
    ],
  },
];

export const dashboardRoutes: DashboardRoute[] = dashboardNavGroups.flatMap(
  (group) => group.routes,
);

export const helpRoute: DashboardRoute = {
  title: "Help & Guide",
  href: `${DASHBOARD_BASE_PATH}/help`,
  icon: CircleHelp,
  description: "Learn how to use ShipFlow AI from start to finish",
};

export const platformAdminRoute: DashboardRoute = {
  title: "Platform admin",
  href: `${DASHBOARD_BASE_PATH}/admin`,
  icon: Shield,
  description: "Site-wide users and sign-ins (operators only)",
};

export function getDashboardRoute(pathname: string) {
  const allRoutes = [...dashboardRoutes, helpRoute, platformAdminRoute];
  return allRoutes.find(
    (route) =>
      route.href === pathname ||
      (route.href !== DASHBOARD_BASE_PATH && pathname.startsWith(`${route.href}/`)),
  );
}

export const FEATURE_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  clarifying: "Clarifying",
  prd_generating: "Writing requirements",
  awaiting_prd_approval: "Awaiting requirements approval",
  prd_ready: "Requirements ready",
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
