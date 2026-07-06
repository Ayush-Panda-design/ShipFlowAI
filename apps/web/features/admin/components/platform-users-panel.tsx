"use client";

import { formatDistanceToNow } from "date-fns";
import { useCallback, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  UserActivityDetailSheet,
  type AnalyticsResponse,
} from "@/features/admin/components/user-activity-detail-sheet";
import { formatDuration } from "@/features/admin/lib/format-duration";
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
  const [selectedUser, setSelectedUser] = useState<PlatformUserRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse | null>(
    null,
  );
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const activeNow = users.filter((user) => user.activeSessions > 0).length;
  const withGitHub = users.filter((user) => user.githubLogin).length;
  const totalSiteTimeMs = users.reduce(
    (sum, user) => sum + user.totalTimeMs,
    0,
  );

  const loadUserAnalytics = useCallback(async (userId: string) => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/analytics`);
      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }
      const json = (await response.json()) as AnalyticsResponse;
      setAnalyticsData(json);
    } catch {
      setAnalyticsError("Could not load activity data. Try again.");
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) {
      setAnalyticsData(null);
      setAnalyticsError(null);
      setAnalyticsLoading(false);
    }
  }

  function openUserActivity(user: PlatformUserRow) {
    setSelectedUser(user);
    setSheetOpen(true);
    void loadUserAnalytics(user.id);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total time on site</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {formatDuration(totalSiteTimeMs)}
            </CardTitle>
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
                  <TableHead>Location</TableHead>
                  <TableHead>Sign-ins</TableHead>
                  <TableHead>Time on site</TableHead>
                  <TableHead>Sessions</TableHead>
                  <TableHead className="text-right">Activity</TableHead>
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
                    <TableCell className="max-w-[180px] text-xs">
                      {user.lastLocation ? (
                        <p className="font-medium leading-snug">{user.lastLocation}</p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {user.signInCount > 0 ? user.signInCount : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {user.totalTimeMs > 0 ? (
                        <div>
                          <p className="tabular-nums">
                            {formatDuration(user.totalTimeMs)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {user.trackedTimeMs > 0
                              ? "tracked"
                              : "from sign-ins"}
                          </p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.activeSessions > 0 ? "default" : "secondary"}
                      >
                        {user.activeSessions} active
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openUserActivity(user)}
                      >
                        View details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UserActivityDetailSheet
        user={selectedUser}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        data={analyticsData}
        loading={analyticsLoading}
        error={analyticsError}
        onRefresh={() => {
          if (selectedUser) {
            void loadUserAnalytics(selectedUser.id);
          }
        }}
      />
    </div>
  );
}
