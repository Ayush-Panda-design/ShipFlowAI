import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/auth-session";

export default async function SettingsPage() {
  const session = await requireSession("/dashboard/settings");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Account preferences and integrations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Signed in as</span>{" "}
          {session.user.email}
        </p>
        <p className="text-muted-foreground">
          Profile and notification settings will be added in a later chapter.
        </p>
      </CardContent>
    </Card>
  );
}
