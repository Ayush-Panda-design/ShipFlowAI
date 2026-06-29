import Link from "next/link";
import { GitBranch } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import type { GitHubConnectionStatus } from "@/features/github/server/installation";

type GitHubSetupBannerProps = {
  status: GitHubConnectionStatus;
};

export function GitHubSetupBanner({ status }: GitHubSetupBannerProps) {
  if (status.state === "connected") {
    return null;
  }

  if (status.state === "needs_github_signin") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            Repository features need GitHub sign-in
          </p>
          <p className="text-amber-800 dark:text-amber-300">
            Email login only gives you a ShipFlow account. Sign out and use{" "}
            <strong>Sign in with GitHub</strong> to connect repositories and
            run PR reviews.
          </p>
        </div>
        <Link href="/sign-in" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <GitBranch className="size-4" />
          Sign in with GitHub
        </Link>
      </div>
    );
  }

  const linkHint =
    status.hint === "link"
      ? "You may have already approved access on GitHub — open GitHub App and click Link my installation."
      : "Open GitHub App and click Install on GitHub to grant repository access on your account.";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="font-medium text-sky-900 dark:text-sky-200">
          Repository access not connected yet
        </p>
        <p className="text-sky-800 dark:text-sky-300">
          GitHub sign-in is separate from repo permission. {linkHint}
        </p>
      </div>
      <Link
        href={`${DASHBOARD_BASE_PATH}/github-app`}
        className={buttonVariants({ size: "sm" })}
      >
        <GitBranch className="size-4" />
        Open GitHub App setup
      </Link>
    </div>
  );
}
