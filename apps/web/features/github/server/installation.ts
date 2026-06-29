import { Octokit } from "octokit";

import { getGitHubApp } from "@/features/github/utils/github-app";
import { prisma } from "@/lib/db";

async function getGitHubOAuthAccount(userId: string) {
  return prisma.account.findFirst({
    where: { userId, providerId: "github" },
    select: { accountId: true, accessToken: true },
  });
}

async function listInstallationsAccessibleToUser(userId: string) {
  const githubAccount = await getGitHubOAuthAccount(userId);

  if (!githubAccount?.accountId) {
    throw new Error(
      "Sign in with GitHub first, then install the GitHub App on your account.",
    );
  }

  if (!githubAccount.accessToken) {
    throw new Error(
      "GitHub access expired. Sign out and sign in with GitHub again, then reconnect the app.",
    );
  }

  const appId = process.env.GITHUB_APP_ID?.trim();
  if (!appId) {
    throw new Error("GITHUB_APP_ID is not configured");
  }

  const userOctokit = new Octokit({ auth: githubAccount.accessToken });
  const installations = await userOctokit.paginate(
    userOctokit.rest.apps.listInstallationsForAuthenticatedUser,
    { per_page: 100 },
  );

  return {
    githubAccount,
    installations: installations.filter(
      (installation) => String(installation.app_id) === appId,
    ),
  };
}

async function getInstallationAccount(installationId: number) {
  const app = getGitHubApp();
  const { data } = await app.octokit.rest.apps.getInstallation({
    installation_id: installationId,
  });

  const account = data.account;
  if (!account || !("id" in account) || account.id == null) {
    return null;
  }

  return {
    id: String(account.id),
    login: "login" in account ? account.login : null,
    type: "type" in account ? account.type : null,
  };
}

/**
 * Verifies an installation belongs to the signed-in user.
 * Personal accounts are checked via the GitHub App (no user OAuth token needed).
 */
async function assertUserOwnsInstallation(userId: string, installationId: number) {
  const githubAccount = await getGitHubOAuthAccount(userId);

  if (!githubAccount?.accountId) {
    throw new Error(
      "Sign in with GitHub first, then install the GitHub App on your account.",
    );
  }

  const account = await getInstallationAccount(installationId);
  if (!account) {
    throw new Error("GitHub App installation not found.");
  }

  if (account.id === githubAccount.accountId) {
    return;
  }

  if (!githubAccount.accessToken) {
    throw new Error(
      "This installation is on a different GitHub account, or your GitHub session expired. Sign out and sign in with GitHub again.",
    );
  }

  const { installations } = await listInstallationsAccessibleToUser(userId);
  const owned = installations.some((installation) => installation.id === installationId);

  if (!owned) {
    throw new Error(
      "This GitHub App installation is not on your GitHub account. Install the app on your own account — you cannot access someone else's repositories.",
    );
  }
}

export async function getInstallationForUser(userId: string) {
  const installation = await prisma.gitHubInstallation.findUnique({
    where: { userId },
  });

  if (!installation) {
    return null;
  }

  try {
    await assertUserOwnsInstallation(userId, installation.installationId);
    return installation;
  } catch {
    await deleteInstallationForUser(userId);
    return null;
  }
}

export async function saveInstallationFromGitHub(
  userId: string,
  installationId: number,
) {
  await assertUserOwnsInstallation(userId, installationId);

  const account = await getInstallationAccount(installationId);
  if (!account?.login) {
    throw new Error("Installation account not found");
  }

  return prisma.gitHubInstallation.upsert({
    where: { userId },
    create: {
      userId,
      installationId,
      accountLogin: account.login,
      accountType: account.type ?? "User",
    },
    update: {
      installationId,
      accountLogin: account.login,
      accountType: account.type ?? "User",
    },
  });
}

export async function syncInstallationForUser(userId: string) {
  const githubAccount = await getGitHubOAuthAccount(userId);

  if (!githubAccount?.accountId) {
    throw new Error(
      "Sign in with GitHub first, then install the GitHub App on your account.",
    );
  }

  if (!githubAccount.accessToken) {
    throw new Error(
      "GitHub access expired. Sign out and sign in with GitHub again, then click Link my installation.",
    );
  }

  const { installations } = await listInstallationsAccessibleToUser(userId);

  if (installations.length === 0) {
    throw new Error(
      "No GitHub App installation found on your GitHub account. Click Install on GitHub first.",
    );
  }

  const personal = installations.find((installation) => {
    const accountId = installation.account?.id;
    return accountId != null && String(accountId) === githubAccount.accountId;
  });

  const match = personal ?? (installations.length === 1 ? installations[0]! : null);

  if (!match) {
    throw new Error(
      "Multiple GitHub App installations found. Use Install on GitHub and pick your personal account, or your org if you only use one org.",
    );
  }

  return saveInstallationFromGitHub(userId, match.id);
}

export async function deleteInstallationForUser(userId: string) {
  await prisma.gitHubInstallation.deleteMany({
    where: { userId },
  });
}

export type GitHubConnectionStatus =
  | { state: "connected"; accountLogin: string }
  | { state: "needs_install"; signedInWithGitHub: true; hint: "install" | "link" }
  | { state: "needs_github_signin" };

/** Silently link if the user already installed the GitHub App on their signed-in account. */
export async function tryAutoLinkGitHubInstallation(userId: string) {
  const existing = await getInstallationForUser(userId);
  if (existing) {
    return existing;
  }

  const githubAccount = await getGitHubOAuthAccount(userId);
  if (!githubAccount?.accessToken) {
    return null;
  }

  try {
    return await syncInstallationForUser(userId);
  } catch {
    return null;
  }
}

export async function getGitHubConnectionStatus(
  userId: string,
): Promise<GitHubConnectionStatus> {
  const installation =
    (await getInstallationForUser(userId)) ??
    (await tryAutoLinkGitHubInstallation(userId));

  if (installation) {
    return { state: "connected", accountLogin: installation.accountLogin };
  }

  const githubAccount = await getGitHubOAuthAccount(userId);
  if (!githubAccount) {
    return { state: "needs_github_signin" };
  }

  return {
    state: "needs_install",
    signedInWithGitHub: true,
    hint: githubAccount.accessToken ? "link" : "install",
  };
}
