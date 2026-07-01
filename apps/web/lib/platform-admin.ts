import { notFound } from "next/navigation";

import { getServerSession } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

const DEFAULT_PLATFORM_ADMIN_GITHUB_LOGINS = ["ayush-panda-design"];

function readListEnv(name: string) {
  return (
    process.env[name]
      ?.split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean) ?? []
  );
}

export function getPlatformAdminGitHubLogins() {
  const fromEnv = readListEnv("SHIPFLOW_PLATFORM_ADMIN_GITHUB_LOGINS");
  return fromEnv.length > 0 ? fromEnv : DEFAULT_PLATFORM_ADMIN_GITHUB_LOGINS;
}

export function getPlatformAdminEmails() {
  return readListEnv("SHIPFLOW_PLATFORM_ADMIN_EMAILS");
}

/** GitHub noreply emails store login as `{id}+{login}@users.noreply.github.com`. */
export function githubLoginFromUserEmail(email: string) {
  const match = email.match(/\+([^@]+)@users\.noreply\.github\.com$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export async function resolveUserGitHubLogin(userId: string, email: string) {
  const fromEmail = githubLoginFromUserEmail(email);
  if (fromEmail) {
    return fromEmail;
  }

  const installation = await prisma.gitHubInstallation.findUnique({
    where: { userId },
    select: { accountLogin: true },
  });

  return installation?.accountLogin?.toLowerCase() ?? null;
}

export async function isPlatformAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    return false;
  }

  const adminEmails = getPlatformAdminEmails();
  if (adminEmails.includes(user.email.toLowerCase())) {
    return true;
  }

  const githubLogin = await resolveUserGitHubLogin(userId, user.email);
  if (!githubLogin) {
    return false;
  }

  return getPlatformAdminGitHubLogins().includes(githubLogin);
}

export async function requirePlatformAdmin() {
  const session = await getServerSession();
  if (!session) {
    notFound();
  }

  const allowed = await isPlatformAdmin(session.user.id);
  if (!allowed) {
    notFound();
  }

  return session;
}
