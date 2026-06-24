import { GitHubConnectCard } from "@/features/dashboard/components/github-connect-card";
import { getInstallationForUser } from "@/features/github/server/installation";
import { requireSession } from "@/lib/auth-session";

type GitHubAppPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function GitHubAppPage({ searchParams }: GitHubAppPageProps) {
  const session = await requireSession("/dashboard/github-app");
  const { error } = await searchParams;
  const installation = await getInstallationForUser(session.user.id);

  return (
    <GitHubConnectCard
      userId={session.user.id}
      installation={
        installation
          ? {
              accountLogin: installation.accountLogin,
              accountType: installation.accountType,
            }
          : null
      }
      error={error ?? null}
    />
  );
}
