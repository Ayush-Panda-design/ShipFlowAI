"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
import { dashboardRoutes } from "@/features/dashboard/lib/routes";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              className="data-[active=true]:bg-transparent"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-sm font-semibold">AI</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Code Reviewer</span>
                <span className="truncate text-xs text-muted-foreground">
                  AI-powered reviews
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {dashboardRoutes.map((route) => {
                const isActive =
                  route.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === route.href ||
                      pathname.startsWith(`${route.href}/`);

                return (
                  <SidebarMenuItem key={route.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={route.title}
                      render={<Link href={route.href} />}
                    >
                      <route.icon />
                      <span>{route.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <p
          className={cn(
            "px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
          )}
        >
          Mock data preview
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
