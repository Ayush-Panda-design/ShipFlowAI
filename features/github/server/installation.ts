import { getGitHubApp } from "@/features/github/utils/github-app";
import { prisma } from "@/lib/db";

export async function getInstallationForUser(userId: string) {
  return prisma.gitHubInstallation.findUnique({
    where: { userId },
  });
}

export async function saveInstallationFromGitHub(
  userId: string,
  installationId: number
) {
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
  const app = getGitHubApp();
  const installations = await app.octokit.paginate(
    app.octokit.rest.apps.listInstallations,
    { per_page: 100 }
  );

  if (installations.length === 0) {
    throw new Error(
      "No GitHub App installations found. Install the app on GitHub first."
    );
  }

  const githubAccount = await prisma.account.findFirst({
    where: { userId, providerId: "github" },
  });

  let match = installations.find((installation) => {
    const accountId = installation.account?.id;
    if (!accountId || !githubAccount) {
      return false;
    }

    return String(accountId) === githubAccount.accountId;
  });

  if (!match) {
    const orgInstallations = installations.filter(
      (installation) => installation.account?.type === "Organization"
    );

    if (orgInstallations.length === 1) {
      match = orgInstallations[0];
    }
  }

  if (!match && installations.length === 1) {
    match = installations[0];
  }

  if (!match) {
    throw new Error(
      "Could not match your account to a GitHub App installation. Try installing again from this page."
    );
  }

  return saveInstallationFromGitHub(userId, match.id);
}

export async function deleteInstallationForUser(userId: string) {
  await prisma.gitHubInstallation.deleteMany({
    where: { userId },
  });
}
