import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { getInstallationForUser } from "@/features/github/server/installation";
import { listPullRequestsForInstallation } from "@/features/reviews/server/list-pull-requests";
import { requireSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";
import { GitPullRequest } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  reviewing:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  completed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed:
    "border-destructive/30 bg-destructive/10 text-destructive",
};

export default async function PullRequestsPage() {
  const session = await requireSession("/dashboard/pull-requests");
  const installation = await getInstallationForUser(session.user.id);

  if (!installation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pull Requests</CardTitle>
          <CardDescription>
            Connect the GitHub App to receive pull request webhooks and track
            reviews here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`${DASHBOARD_BASE_PATH}/github-app`}
            className={buttonVariants()}
          >
            Connect GitHub App
          </Link>
        </CardContent>
      </Card>
    );
  }

  const pullRequests = await listPullRequestsForInstallation(
    installation.installationId
  );

  if (pullRequests.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GitPullRequest />
          </EmptyMedia>
          <EmptyTitle>No pull requests yet</EmptyTitle>
          <EmptyDescription>
            Open or update a pull request on a connected repository. GitHub will
            send a webhook and it will appear here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Pull Requests</h2>
        <p className="text-sm text-muted-foreground">
          PRs received via webhook for @{installation.accountLogin}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Repository</TableHead>
            <TableHead>PR</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pullRequests.map((pullRequest) => (
            <TableRow key={pullRequest.id}>
              <TableCell className="font-medium">
                {pullRequest.repoFullName}
              </TableCell>
              <TableCell>#{pullRequest.prNumber}</TableCell>
              <TableCell className="max-w-xs truncate">
                {pullRequest.title}
              </TableCell>
              <TableCell>@{pullRequest.authorLogin}</TableCell>
              <TableCell>{pullRequest.baseBranch}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium capitalize",
                    statusStyles[pullRequest.status] ??
                      "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {pullRequest.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {pullRequest.updatedAt.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
