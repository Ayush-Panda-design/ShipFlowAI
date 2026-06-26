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
import { ReviewConfigBanner } from "@/features/dashboard/components/review-config-banner";
import { RunReviewButton } from "@/features/dashboard/components/run-review-button";
import { SyncPullRequestsButton } from "@/features/dashboard/components/sync-pull-requests-button";
import { getInstallationForUser } from "@/features/github/server/installation";
import { listPullRequestsForInstallation } from "@/features/reviews/server/list-pull-requests";
import { isReviewPipelineConfigured } from "@/features/reviews/server/review-config";
import { syncPullRequestsForInstallation } from "@/features/reviews/server/sync-pull-requests";
import { requireSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";
import { GitPullRequest } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  processing:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  reviewed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
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

  const reviewConfigured = isReviewPipelineConfigured();

  let pullRequests = await listPullRequestsForInstallation(
    installation.installationId
  );

  if (pullRequests.length === 0) {
    try {
      await syncPullRequestsForInstallation(installation.installationId);
      pullRequests = await listPullRequestsForInstallation(
        installation.installationId
      );
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("[pull-requests] sync failed:", error);
      }
    }
  }

  if (pullRequests.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <GitPullRequest />
          </EmptyMedia>
          <EmptyTitle>No pull requests yet</EmptyTitle>
          <EmptyDescription>
            Open a pull request on a connected repository, or sync existing open
            PRs from GitHub. For live updates, point your GitHub App webhook to
            your ngrok URL plus <code>/api/github/webhook</code>.
          </EmptyDescription>
        </EmptyHeader>
        <SyncPullRequestsButton />
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ReviewConfigBanner />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Pull Requests</h2>
          <p className="text-sm text-muted-foreground">
            PRs for @{installation.accountLogin}
          </p>
        </div>
        <SyncPullRequestsButton />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Repository</TableHead>
            <TableHead>PR</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Feature</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
              <TableCell className="max-w-[10rem] truncate text-xs">
                {pullRequest.featureRequest ? (
                  <Link
                    href={`${DASHBOARD_BASE_PATH}/feature-requests/${pullRequest.featureRequest.id}`}
                    className="hover:underline"
                  >
                    {pullRequest.featureRequest.title}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
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
              <TableCell className="text-right">
                <RunReviewButton
                  pullRequestId={pullRequest.id}
                  disabled={!reviewConfigured}
                  label={
                    pullRequest.status === "failed" ? "Retry review" : "Run review"
                  }
                />
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
