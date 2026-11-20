"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Building2 } from "lucide-react";

import { ShipFlowGlyph } from "@/components/brand/shipflow-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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

type SidebarUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type SidebarSignals = {
  /** Route the user should visit next in the guided journey (gets a "Next" marker). */
  nextHref: string | null;
  nextLabel: string | null;
  /** Count badges keyed by route href (shown only when > 0). */
  badges: Record<string, number>;
};

type DashboardSidebarProps = {
  signals?: SidebarSignals;
  user?: SidebarUser;
  workspaces: { id: string; name: string }[];
  activeWorkspaceId: string;
  showPlatformAdmin?: boolean;
};

function isRouteActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  route,
  pathname,
  signals,
}: {
  route: DashboardRoute;
  pathname: string;
  signals?: SidebarSignals;
}) {
  const isNext = Boolean(signals?.nextHref) && signals?.nextHref === route.href;
  const badge = signals?.badges[route.href] ?? 0;
  const isActive = isRouteActive(pathname, route.href);
  const Icon = route.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={route.description ? `${route.title} — ${route.description}` : route.title}
        render={<Link href={route.href} />}
        className={cn(
          "relative h-8 rounded-[0.6rem] px-2.5 text-[0.8125rem] font-medium text-sidebar-foreground/70 transition-all duration-150",
          "hover:bg-white/60 hover:text-sidebar-foreground dark:hover:bg-sidebar-accent/60",
          isActive &&
            "bg-brand-soft text-brand-strong shadow-[inset_0_0_0_1px_rgb(168_61_80_/_0.12)] hover:bg-brand-soft hover:text-brand-strong dark:bg-sidebar-accent dark:text-sidebar-accent-foreground",
        )}
      >
        {isActive ? (
          <span
            aria-hidden
            className="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand group-data-[collapsible=icon]:hidden"
          />
        ) : null}
        <Icon
          className={cn(
            "size-[17px] transition-colors",
            isActive ? "text-brand" : "text-sidebar-foreground/50",
          )}
        />
        <span>{route.title}</span>
        {badge > 0 ? (
          <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[10.5px] font-semibold tabular-nums text-primary-foreground group-data-[collapsible=icon]:hidden">
            {badge}
          </span>
        ) : isNext ? (
          <span
            className="ml-auto inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand group-data-[collapsible=icon]:hidden"
            title={signals?.nextLabel ?? "Next step"}
          >
            <span className="size-1.5 rounded-full bg-brand motion-safe:animate-pulse" />
            Next
          </span>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function DashboardSidebar({
  signals,
  user,
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
      <SidebarHeader className="px-3 pb-3 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              className="h-auto gap-3 rounded-xl p-1.5 hover:bg-white/60 data-[active=true]:bg-transparent dark:hover:bg-sidebar-accent/60"
            >
              <span className="block size-10 shrink-0 drop-shadow-[0_4px_10px_rgb(168_61_80_/_0.28)] group-data-[collapsible=icon]:size-8">
                <ShipFlowGlyph className="!size-full" />
              </span>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-[0.95rem] font-semibold tracking-tight">
                  Ship<span className="text-brand">Flow</span>{" "}
                  <span className="font-normal text-muted-foreground">AI</span>
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  Idea → Production
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden p-0">
        <AutoHideScroll className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-2">
          {dashboardNavGroups.map((group, index) => (
            <SidebarGroup key={group.id} className={cn("px-3 py-1", index === 0 && "pt-0")}>
              <SidebarGroupLabel className="mb-0.5 h-auto items-baseline justify-between gap-2 px-2.5 pb-1 pt-2">
                <span className="sf-eyebrow !text-[10.5px]">{group.label}</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.routes.map((route) => (
                    <NavItem key={route.href} route={route} pathname={pathname} signals={signals} />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}

          {showPlatformAdmin ? (
            <>
              <SidebarGroup className="px-3 py-1.5">
                <SidebarGroupLabel className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-danger">
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
                          "h-9 rounded-[0.65rem] text-[0.8125rem] font-medium text-danger hover:bg-danger-soft hover:text-danger",
                          adminActive
                            ? "bg-danger-soft"
                            : "",
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

          <SidebarGroup className="px-3 py-1.5">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={helpActive}
                    tooltip={helpRoute.description ?? helpRoute.title}
                    render={<Link href={helpRoute.href} />}
                    className={cn(
                      "h-9 rounded-[0.65rem] border border-dashed border-border bg-white/40 text-[0.8125rem] font-medium text-sidebar-foreground/70 transition-all hover:border-brand/40 hover:bg-white/70 hover:text-brand dark:bg-transparent",
                      helpActive && "border-solid border-brand/20 bg-brand-soft text-brand-strong",
                    )}
                  >
                    <helpRoute.icon className="size-[17px] text-brand" />
                    <span>{helpRoute.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </AutoHideScroll>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card/80 p-2 shadow-soft group-data-[collapsible=icon]:hidden">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-soft text-warning">
            <Building2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="sf-eyebrow !text-[10px] leading-none">Workspace</p>
            <WorkspaceSwitcher
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
            />
          </div>
        </div>

        {user && (user.name || user.email) ? (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-white/60 dark:hover:bg-sidebar-accent/60"
            title="Account settings"
          >
            <Avatar size="sm">
              {user.image ? <AvatarImage src={user.image} alt={user.name ?? "User"} /> : null}
              <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <p className="truncate text-[0.8125rem] font-medium">{user.name || user.email}</p>
              {user.name && user.email ? (
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
          </Link>
        ) : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
