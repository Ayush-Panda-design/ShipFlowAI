import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

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
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { confidenceLabel } from "@/features/reviews/types/structured-review";
import { getInstallationForUser } from "@/features/github/server/installation";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export default async function ReviewHistoryPage() {
  const session = await requireSession("/dashboard/review-history");
  await ensureWorkspaceAction();
  const installation = await getInstallationForUser(session.user.id);

  const reviews = installation
    ? await prisma.aIReview.findMany({
        where: { pullRequest: { installationId: installation.installationId } },
        include: {
          pullRequest: {
            select: {
              repoFullName: true,
              prNumber: true,
              title: true,
              status: true,
            },
          },
          featureRequest: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Review History</h1>
        <p className="text-sm text-muted-foreground">
          AI review results across all pull requests
        </p>
      </div>

      {!installation ? (
        <Card>
          <CardHeader>
            <CardTitle>GitHub App not connected</CardTitle>
            <CardDescription>
              Install the GitHub App to see AI review history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`${DASHBOARD_BASE_PATH}/github-app`} className="text-sm underline">
              Connect GitHub App
            </Link>
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No AI reviews yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Repository</TableHead>
              <TableHead>PR</TableHead>
              <TableHead>Feature</TableHead>
              <TableHead>Blocking</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <TableRow key={review.id}>
                <TableCell>{review.pullRequest.repoFullName}</TableCell>
                <TableCell>#{review.pullRequest.prNumber}</TableCell>
                <TableCell>
                  {review.featureRequest ? (
                    <Link
                      href={`${DASHBOARD_BASE_PATH}/feature-requests/${review.featureRequest.id}`}
                      className="hover:underline"
                    >
                      {review.featureRequest.title}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {review.blockingCount > 0 ? (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      {review.blockingCount}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {review.confidenceScore != null ? (
                    <span title={confidenceLabel(review.confidenceScore)}>
                      {review.confidenceScore}%
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="max-w-md truncate text-sm">
                  {review.summary}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDistanceToNow(review.createdAt, { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
