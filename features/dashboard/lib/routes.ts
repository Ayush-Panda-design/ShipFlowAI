import type { LucideIcon } from "lucide-react";
import {
  AppWindow,
  FolderGit2,
  GitPullRequest,
  LayoutDashboard,
  Settings,
} from "lucide-react";

export type DashboardRoute = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export const DASHBOARD_BASE_PATH = "/dashboard";

export const dashboardRoutes: DashboardRoute[] = [
  {
    title: "Overview",
    href: DASHBOARD_BASE_PATH,
    icon: LayoutDashboard,
    description: "Summary of your code review activity",
  },
  {
    title: "Repositories",
    href: `${DASHBOARD_BASE_PATH}/repositories`,
    icon: FolderGit2,
  },
  {
    title: "Pull Requests",
    href: `${DASHBOARD_BASE_PATH}/pull-requests`,
    icon: GitPullRequest,
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
      (route.href !== DASHBOARD_BASE_PATH && pathname.startsWith(`${route.href}/`))
  );
}
