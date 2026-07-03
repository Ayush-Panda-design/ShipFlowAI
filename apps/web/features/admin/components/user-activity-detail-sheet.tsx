"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  BarChart3,
  Clock,
  Eye,
  LogIn,
  RefreshCw,
} from "lucide-react";

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
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDuration,
  formatEventType,
} from "@/features/admin/lib/format-duration";
import type { SignInSessionRow, UserAnalyticsSummary } from "@repo/services";
import type { PlatformUserRow } from "@/features/admin/server/list-platform-users";

type AnalyticsResponse = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    signedUpAt: string;
  };
  analytics: UserAnalyticsSummary;
  signInSessions: SignInSessionRow[];
};

export type { AnalyticsResponse };

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

export function UserActivityDetailSheet({
  user,
  open,
  onOpenChange,
  data,
  loading,
  error,
  onRefresh,
}: {
  user: PlatformUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AnalyticsResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const analytics = data?.analytics;
  const signInSessions = data?.signInSessions ?? [];
  const maxPageTime = analytics?.pageBreakdown[0]?.timeMs ?? 1;
  const hasSiteAnalytics =
    analytics &&
    (analytics.totalTimeMs > 0 ||
      analytics.totalPageViews > 0 ||
      analytics.recentEvents.length > 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>User activity</SheetTitle>
          <SheetDescription>
            Sign-in history (all time) and on-site activity (since tracking was
            enabled).
          </SheetDescription>
        </SheetHeader>

        {user ? (
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                {user.image ? (
                  <AvatarImage src={user.image} alt={user.name} />
                ) : null}
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {user.displayEmail}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw
                  className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : loading && !data ? (
              <p className="text-sm text-muted-foreground">Loading activity…</p>
            ) : data ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SummaryCard
                    label="Total time on site"
                    value={formatDuration(analytics?.totalTimeMs ?? 0)}
                    icon={Clock}
                  />
                  <SummaryCard
                    label="Sign-in sessions"
                    value={signInSessions.length}
                    icon={LogIn}
                  />
                  <SummaryCard
                    label="Page views"
                    value={analytics?.totalPageViews ?? 0}
                    icon={Eye}
                  />
                  <SummaryCard
                    label="Browser visits"
                    value={analytics?.totalVisits ?? 0}
                    icon={BarChart3}
                  />
                </div>

                {!hasSiteAnalytics ? (
                  <p className="text-xs text-muted-foreground">
                    Page-level activity is only recorded after on-site tracking
                    was enabled. Sign-in history below includes all prior
                    sessions still stored in the database.
                  </p>
                ) : null}

                {analytics?.lastActiveAt ? (
                  <p className="text-xs text-muted-foreground">
                    Last tracked activity{" "}
                    {formatDistanceToNow(new Date(analytics.lastActiveAt), {
                      addSuffix: true,
                    })}
                  </p>
                ) : null}

                <Tabs defaultValue={signInSessions.length > 0 ? "sign-ins" : "pages"}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="sign-ins">Sign-ins</TabsTrigger>
                    <TabsTrigger value="pages">Pages</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="visits">Visits</TabsTrigger>
                  </TabsList>

                  <TabsContent value="sign-ins" className="mt-4">
                    {signInSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No sign-in sessions recorded.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Signed in</TableHead>
                            <TableHead>Device</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead>Active period</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {signInSessions.map((session) => (
                            <TableRow key={session.id}>
                              <TableCell className="whitespace-nowrap text-xs">
                                <p>
                                  {format(
                                    new Date(session.signedInAt),
                                    "MMM d, yyyy · HH:mm",
                                  )}
                                </p>
                                <p className="text-muted-foreground">
                                  Last active{" "}
                                  {formatDistanceToNow(
                                    new Date(session.lastActiveAt),
                                    { addSuffix: true },
                                  )}
                                </p>
                              </TableCell>
                              <TableCell className="max-w-[140px] text-xs">
                                <p className="truncate font-medium">
                                  {session.deviceLabel}
                                </p>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {session.ipAddress ?? "—"}
                              </TableCell>
                              <TableCell className="text-xs tabular-nums">
                                {session.activityDurationMs > 0
                                  ? formatDuration(session.activityDurationMs)
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    session.isActive ? "default" : "secondary"
                                  }
                                >
                                  {session.isActive ? "Active" : "Ended"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="pages" className="mt-4 space-y-3">
                    {!analytics || analytics.pageBreakdown.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No page activity recorded yet.
                      </p>
                    ) : (
                      analytics.pageBreakdown.map((page) => (
                        <div key={page.path} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {page.pageTitle ?? page.path}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {page.path}
                              </p>
                            </div>
                            <div className="shrink-0 text-right text-xs">
                              <p className="font-medium tabular-nums">
                                {formatDuration(page.timeMs)}
                              </p>
                              <p className="text-muted-foreground">
                                {page.visits} visit{page.visits === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                          <Progress
                            value={(page.timeMs / maxPageTime) * 100}
                            className="h-1.5"
                          />
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-4">
                    {!analytics || analytics.recentEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No events recorded yet.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>When</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.recentEvents.map((event) => (
                            <TableRow key={event.id}>
                              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                {format(
                                  new Date(event.createdAt),
                                  "MMM d, HH:mm:ss",
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {formatEventType(event.type)}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[200px]">
                                <p className="truncate text-xs">
                                  {event.action ??
                                    event.pageTitle ??
                                    event.path ??
                                    event.detail ??
                                    "—"}
                                </p>
                                {event.detail && event.action ? (
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {event.detail}
                                  </p>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                {event.durationMs > 0
                                  ? formatDuration(event.durationMs)
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="visits" className="mt-4 space-y-3">
                    {!analytics || analytics.visitSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No visit sessions recorded yet.
                      </p>
                    ) : (
                      analytics.visitSessions.map((visit) => (
                        <Card key={visit.visitId}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between gap-2">
                              <CardTitle className="text-sm">
                                {format(
                                  new Date(visit.startedAt),
                                  "MMM d, yyyy · HH:mm",
                                )}
                              </CardTitle>
                              <Badge variant="outline">
                                {formatDuration(visit.durationMs)}
                              </Badge>
                            </div>
                            <CardDescription>
                              {visit.pageCount} pages · {visit.actionCount}{" "}
                              actions
                            </CardDescription>
                          </CardHeader>
                          {visit.pages.length > 0 ? (
                            <CardContent>
                              <ul className="flex flex-wrap gap-1">
                                {visit.pages.map((page) => (
                                  <Badge
                                    key={`${visit.visitId}-${page}`}
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    {page}
                                  </Badge>
                                ))}
                              </ul>
                            </CardContent>
                          ) : null}
                        </Card>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No activity data available.
              </p>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
