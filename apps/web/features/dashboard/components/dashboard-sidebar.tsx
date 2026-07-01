"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ShipFlowMark } from "@/components/brand/shipflow-logo";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { AutoHideScroll } from "@/components/ui/auto-hide-scroll";
import {
  dashboardNavGroups,
  helpRoute,
  platformAdminRoute,
  type DashboardRoute,
} from "@/features/dashboard/lib/routes";
import { WorkspaceSwitcher } from "@/features/dashboard/components/workspace-switcher";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  workspaces: { id: string; name: string }[];
  activeWorkspaceId: string;
  showPlatformAdmin?: boolean;
};

const GROUP_ACCENT: Record<string, string> = {
  home: "from-sky-500/15 to-transparent",
  planning: "from-amber-500/12 to-transparent",
  review: "from-violet-500/12 to-transparent",
  ship: "from-emerald-500/12 to-transparent",
  account: "from-slate-500/10 to-transparent",
};

function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ route, pathname }: { route: DashboardRoute; pathname: string }) {
  const isActive = isRouteActive(pathname, route.href);
  const Icon = route.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={route.description ? `${route.title} — ${route.description}` : route.title}
        render={<Link href={route.href} />}
        className={cn(
          "rounded-lg transition-colors",
          isActive && "bg-sidebar-accent font-medium shadow-sm",
        )}
      >
        <Icon className={cn(isActive && "text-primary")} />
        <span>{route.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function DashboardSidebar({
  workspaces,
  activeWorkspaceId,
  showPlatformAdmin = false,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const helpActive =
    pathname === helpRoute.href || pathname.startsWith(`${helpRoute.href}/`);
  const adminActive =
    pathname === platformAdminRoute.href ||
    pathname.startsWith(`${platformAdminRoute.href}/`);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border bg-gradient-to-br from-primary/[0.04] to-transparent">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              className="data-[active=true]:bg-transparent"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-500/15 shadow-sm ring-1 ring-amber-600/20">
                <ShipFlowMark className="size-6" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">ShipFlow AI</span>
                <span className="truncate text-xs text-muted-foreground">
                  Idea to production
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden p-0">
        <AutoHideScroll className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-2">
          {dashboardNavGroups.map((group, index) => (
            <div key={group.id}>
              {index > 0 ? <SidebarSeparator className="my-1.5 opacity-60" /> : null}
              <SidebarGroup
                className={cn(
                  "relative overflow-hidden rounded-xl py-1.5",
                  "before:pointer-events-none before:absolute before:inset-x-2 before:top-0 before:h-8 before:rounded-lg before:bg-gradient-to-b",
                  GROUP_ACCENT[group.id] ?? "from-transparent to-transparent",
                )}
              >
                <SidebarGroupLabel className="flex h-auto flex-col items-start gap-0 px-3 pb-1 pt-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/70">
                    {group.label}
                  </span>
                  {group.hint ? (
                    <span className="text-[10px] font-normal normal-case tracking-normal text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
                      {group.hint}
                    </span>
                  ) : null}
                </SidebarGroupLabel>
                <SidebarGroupContent className="px-1">
                  <SidebarMenu className="gap-0.5">
                    {group.routes.map((route) => (
                      <NavItem key={route.href} route={route} pathname={pathname} />
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          ))}

          {showPlatformAdmin ? (
            <>
              <SidebarSeparator className="my-2" />
              <SidebarGroup className="mx-2 rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.06] to-transparent p-1 shadow-sm">
                <SidebarGroupLabel className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-rose-600/90 dark:text-rose-400/90">
                  Operator
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={adminActive}
                        tooltip={platformAdminRoute.description ?? platformAdminRoute.title}
                        render={<Link href={platformAdminRoute.href} />}
                        className={cn(
                          "rounded-lg font-medium text-rose-700 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300",
                          adminActive
                            ? "bg-rose-500/15 text-rose-700 shadow-sm dark:text-rose-200"
                            : "bg-rose-500/5",
                        )}
                      >
                        <platformAdminRoute.icon />
                        <span>{platformAdminRoute.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </>
          ) : null}

          <SidebarSeparator className="my-2" />

          <SidebarGroup className="mx-2 rounded-xl border border-primary/15 bg-gradient-to-br from-primary/[0.06] to-status-progress/[0.03] p-1 shadow-sm">
            <SidebarGroupLabel className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              Help
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={helpActive}
                    tooltip={helpRoute.description ?? helpRoute.title}
                    render={<Link href={helpRoute.href} />}
                    className={cn(
                      "rounded-lg font-medium text-primary hover:bg-primary/10 hover:text-primary",
                      helpActive
                        ? "bg-primary/15 text-primary shadow-sm"
                        : "bg-primary/5",
                    )}
                  >
                    <helpRoute.icon />
                    <span>{helpRoute.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </AutoHideScroll>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-muted/20 p-2">
        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
