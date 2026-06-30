import { GitHubConnectCard } from "@/features/dashboard/components/github-connect-card";
import { SectionGuideCard } from "@/features/dashboard/components/section-guide-card";
import {
  getGitHubLinkDiagnostics,
  getInstallationForUser,
  tryAutoLinkGitHubInstallation,
} from "@/features/github/server/installation";
import { requireSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

type GitHubAppPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function GitHubAppPage({ searchParams }: GitHubAppPageProps) {
  const session = await requireSession("/dashboard/github-app");
  const { error } = await searchParams;

  let installation = await getInstallationForUser(session.user.id);
  if (!installation) {
    installation = await tryAutoLinkGitHubInstallation(session.user.id);
  }

  const signedInWithGitHub = Boolean(
    await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: "github" },
      select: { id: true },
    }),
  );

  const diagnostics =
    !installation ? await getGitHubLinkDiagnostics(session.user.id) : null;

  return (
    <div className="space-y-6">
      <SectionGuideCard section="github-app" />
      <GitHubConnectCard
      userId={session.user.id}
      signedInWithGitHub={signedInWithGitHub}
      installation={
        installation
          ? {
              accountLogin: installation.accountLogin,
              accountType: installation.accountType,
            }
          : null
      }
      error={error ?? null}
      diagnostics={diagnostics}
    />
    </div>
  );
}
