import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReposList } from "@/features/dashboard/components/repos-list";
import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import { getInstallationForUser } from "@/features/github/server/installation";
import { requireSession } from "@/lib/auth-session";

export default async function RepositoriesPage() {
  const session = await requireSession("/dashboard/repositories");
  const installation = await getInstallationForUser(session.user.id);

  if (!installation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repositories</CardTitle>
          <CardDescription>
            Install the GitHub App to list repositories your account has granted
            access to.
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Repositories</h2>
        <p className="text-sm text-muted-foreground">
          Repositories accessible via @{installation.accountLogin}
        </p>
      </div>
      <ReposList />
    </div>
  );
}
