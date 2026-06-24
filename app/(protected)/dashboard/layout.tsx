import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { requireSession } from "@/lib/auth-session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireSession("/dashboard");

  return <DashboardShell>{children}</DashboardShell>;
}
