import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlatformUserRow } from "@/features/admin/server/list-platform-users";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatWhen(iso: string | null) {
  if (!iso) {
    return "—";
  }

  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function PlatformUsersPanel({
  users,
  total,
}: {
  users: PlatformUserRow[];
  total: number;
}) {
  const activeNow = users.filter((user) => user.activeSessions > 0).length;
  const withGitHub = users.filter((user) => user.githubLogin).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total sign-ups</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active sessions</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{activeNow}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Signed in with GitHub</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{withGitHub}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>
            Everyone who has created an account on ShipFlow AI. Only visible to
            platform admins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Sign-in</TableHead>
                  <TableHead>Workspaces</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead>Last session</TableHead>
                  <TableHead>Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          {user.image ? (
                            <AvatarImage src={user.image} alt={user.name} />
                          ) : null}
                          <AvatarFallback>{initials(user.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.displayEmail}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.providers.map((provider) => (
                          <Badge key={provider} variant="secondary">
                            {provider}
                          </Badge>
                        ))}
                        {user.hasGitHubApp ? (
                          <Badge variant="outline">GitHub App</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {user.workspaces.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ul className="space-y-0.5 text-xs">
                          {user.workspaces.map((workspace) => (
                            <li key={`${user.id}-${workspace.name}`}>
                              {workspace.name}{" "}
                              <span className="text-muted-foreground">
                                ({workspace.role})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatWhen(user.signedUpAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      <div>{formatWhen(user.lastSeenAt)}</div>
                      {user.lastIp ? (
                        <div className="text-[10px] opacity-70">{user.lastIp}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.activeSessions > 0 ? "default" : "secondary"}
                      >
                        {user.activeSessions} active
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
