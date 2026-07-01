"use client";

import { ModeToggle } from "@/components/ui/mode-toggle";
import { UserMenu } from "@/components/user/user-menu";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { WorkspaceSwitcher } from "@/features/dashboard/components/workspace-switcher";
import { AutoHideScroll } from "@/components/ui/auto-hide-scroll";
import { getDashboardRoute } from "@/features/dashboard/lib/routes";
import { usePathname } from "next/navigation";

type DashboardShellProps = {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  workspaces: { id: string; name: string }[];
  activeWorkspaceId: string;
  showPlatformAdmin?: boolean;
};

export function DashboardShell({
  children,
  user,
  workspaces,
  activeWorkspaceId,
  showPlatformAdmin = false,
}: DashboardShellProps) {
  const pathname = usePathname();
  const currentRoute = getDashboardRoute(pathname);

  return (
    <SidebarProvider>
      <DashboardSidebar
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        showPlatformAdmin={showPlatformAdmin}
      />
      <SidebarInset className="flex max-h-svh min-h-svh flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 flex-col">
            <h1 className="text-sm font-semibold">
              {currentRoute?.title ?? "Dashboard"}
            </h1>
            {currentRoute?.description ? (
              <p className="text-xs text-muted-foreground">
                {currentRoute.description}
              </p>
            ) : null}
          </div>
          <ModeToggle />
          <UserMenu user={user} />
        </header>
        <AutoHideScroll className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
          {children}
        </AutoHideScroll>
      </SidebarInset>
    </SidebarProvider>
  );
}
