import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { PullRequestsTableClient } from "@/features/dashboard/components/pull-requests-table-client";
import { ReviewConfigBanner } from "@/features/dashboard/components/review-config-banner";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import { getInstallationForUser } from "@/features/github/server/installation";
import { isReviewPipelineConfigured } from "@/features/reviews/server/review-config";
import { ensureWorkspaceAction } from "@/lib/actions/shipflow";
import { requireSession } from "@/lib/auth-session";
import { countConnectedRepositories } from "@repo/services";

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
  const workspace = await ensureWorkspaceAction();
  const connectedReposCount = await countConnectedRepositories(workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <SectionGuideCard section="pull-requests" />
      <ReviewConfigBanner />
      <PullRequestsTableClient
        reviewConfigured={reviewConfigured}
        connectedReposCount={connectedReposCount}
      />
    </div>
  );
}
