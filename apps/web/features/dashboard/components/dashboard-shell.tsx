"use client";

import { UserMenu } from "@/components/user/user-menu";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { getDashboardRoute } from "@/features/dashboard/lib/routes";
import { usePathname } from "next/navigation";

type DashboardShellProps = {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
};

export function DashboardShell({ children, user }: DashboardShellProps) {
  const pathname = usePathname();
  const currentRoute = getDashboardRoute(pathname);

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
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
          <UserMenu user={user} />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
