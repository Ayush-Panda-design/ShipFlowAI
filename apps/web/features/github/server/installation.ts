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

async function assertUserOwnsInstallation(userId: string, installationId: number) {
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

  const app = getGitHubApp();
  const octokit = await app.getInstallationOctokit(installationId);
  const { data } = await octokit.rest.apps.getInstallation({
    installation_id: installationId,
  });

  const account = data.account;
  if (!account || !("login" in account)) {
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
  const { githubAccount, installations } =
    await listInstallationsAccessibleToUser(userId);

  if (installations.length === 0) {
    throw new Error(
      "No GitHub App installation found on your GitHub account. Click Install on GitHub and choose your account.",
    );
  }

  const personal = installations.find((installation) => {
    const accountId = installation.account?.id;
    return accountId != null && String(accountId) === githubAccount.accountId;
  });

  const match = personal ?? (installations.length === 1 ? installations[0]! : null);

  if (!match) {
    throw new Error(
      "Multiple GitHub App installations found. Open GitHub → Settings → Applications and use the installation for your personal account.",
    );
  }

  return saveInstallationFromGitHub(userId, match.id);
}

export async function deleteInstallationForUser(userId: string) {
  await prisma.gitHubInstallation.deleteMany({
    where: { userId },
  });
}
