import { App } from "octokit";

let githubApp: App | null = null;

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getGitHubAppConfigError(): string | null {
  const appId = readEnv("GITHUB_APP_ID");
  const appName = readEnv("GITHUB_APP_NAME");
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.trim();

  if (!appId && !appName && !privateKey) {
    return "Add GITHUB_APP_ID, GITHUB_APP_NAME, and GITHUB_APP_PRIVATE_KEY to .env, then restart the dev server.";
  }

  if (!appId) {
    return "GITHUB_APP_ID is missing. Use the numeric App ID from your GitHub App settings page (e.g. 4126982).";
  }

  if (!/^\d+$/.test(appId)) {
    return "GITHUB_APP_ID must be the numeric App ID from your GitHub App settings page — not the Client ID (Iv23...).";
  }

  if (!appName) {
    return "GITHUB_APP_NAME is missing. Use your app slug from github.com/apps/{slug}.";
  }

  if (!privateKey) {
    return "GITHUB_APP_PRIVATE_KEY is missing.";
  }

  if (!privateKey.includes("BEGIN") || !privateKey.includes("END RSA PRIVATE KEY")) {
    return "GITHUB_APP_PRIVATE_KEY must be the full .pem file from GitHub App → Private keys → Generate a private key. It starts with -----BEGIN RSA PRIVATE KEY----- and is not the webhook secret or client secret.";
  }

  return null;
}

export function isGitHubAppConfigured() {
  return getGitHubAppConfigError() === null;
}

export function getGitHubInstallUrl(userId: string) {
  if (!isGitHubAppConfigured()) {
    return null;
  }

  const appName = readEnv("GITHUB_APP_NAME");
  if (!appName) {
    return null;
  }

  return `https://github.com/apps/${appName}/installations/new?state=${encodeURIComponent(userId)}`;
}

function getPrivateKey() {
  const key = process.env.GITHUB_APP_PRIVATE_KEY?.trim();
  if (!key) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not set");
  }

  if (!key.includes("END RSA PRIVATE KEY")) {
    throw new Error(
      "GITHUB_APP_PRIVATE_KEY is incomplete. Use a single quoted line with \\n between PEM lines."
    );
  }

  return key.replace(/\\n/g, "\n");
}

export function getGitHubApp() {
  const configError = getGitHubAppConfigError();
  if (configError) {
    throw new Error(configError);
  }

  if (!githubApp) {
    const appId = readEnv("GITHUB_APP_ID");
    if (!appId) {
      throw new Error("GITHUB_APP_ID is not set");
    }

    githubApp = new App({
      appId,
      privateKey: getPrivateKey(),
    });
  }

  return githubApp;
}
