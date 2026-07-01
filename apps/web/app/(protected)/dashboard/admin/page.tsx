import { PlatformUsersPanel } from "@/features/admin/components/platform-users-panel";
import { listPlatformUsers } from "@/features/admin/server/list-platform-users";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export default async function PlatformAdminPage() {
  await requirePlatformAdmin();
  const { users, total } = await listPlatformUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform admin</h1>
        <p className="text-sm text-muted-foreground">
          Site-wide user directory for ShipFlow AI operators only.
        </p>
      </div>

      <PlatformUsersPanel users={users} total={total} />
    </div>
  );
}
