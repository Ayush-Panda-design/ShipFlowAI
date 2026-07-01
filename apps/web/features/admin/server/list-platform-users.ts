import { githubLoginFromUserEmail } from "@/lib/platform-admin";
import { prisma } from "@/lib/db";

export type PlatformUserRow = {
  id: string;
  name: string;
  email: string;
  displayEmail: string;
  githubLogin: string | null;
  emailVerified: boolean;
  image: string | null;
  signedUpAt: string;
  lastSeenAt: string | null;
  lastIp: string | null;
  activeSessions: number;
  providers: string[];
  workspaces: { name: string; role: string }[];
  hasGitHubApp: boolean;
};

function formatDisplayEmail(email: string) {
  const githubLogin = githubLoginFromUserEmail(email);
  if (githubLogin) {
    return `@${githubLogin} (GitHub)`;
  }
  return email;
}

export async function listPlatformUsers(): Promise<{
  users: PlatformUserRow[];
  total: number;
}> {
  const now = new Date();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      accounts: {
        select: { providerId: true },
        orderBy: { createdAt: "asc" },
      },
      githubInstallation: {
        select: { accountLogin: true },
      },
      workspaceMembers: {
        select: {
          role: true,
          workspace: { select: { name: true } },
        },
      },
      sessions: {
        select: {
          createdAt: true,
          expiresAt: true,
          ipAddress: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const rows: PlatformUserRow[] = users.map((user) => {
    const githubLogin =
      githubLoginFromUserEmail(user.email) ??
      user.githubInstallation?.accountLogin?.toLowerCase() ??
      null;

    const latestSession = user.sessions[0];
    const activeSessions = user.sessions.filter(
      (session) => session.expiresAt > now,
    ).length;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      displayEmail: formatDisplayEmail(user.email),
      githubLogin,
      emailVerified: user.emailVerified,
      image: user.image,
      signedUpAt: user.createdAt.toISOString(),
      lastSeenAt: latestSession?.createdAt.toISOString() ?? null,
      lastIp: latestSession?.ipAddress ?? null,
      activeSessions,
      providers: [...new Set(user.accounts.map((account) => account.providerId))],
      workspaces: user.workspaceMembers.map((member) => ({
        name: member.workspace.name,
        role: member.role,
      })),
      hasGitHubApp: Boolean(user.githubInstallation),
    };
  });

  return { users: rows, total: rows.length };
}
