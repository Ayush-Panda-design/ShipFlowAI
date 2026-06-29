/** Client-safe sync error copy — no database or Node imports. */

export function friendlySyncError(raw?: string | null) {
  if (!raw) {
    return "Sync couldn't finish. Please try again in a moment.";
  }

  if (/timed out/i.test(raw)) {
    return "Sync took too long and was stopped. Please try again.";
  }

  if (/(could not start|inngest|background sync)/i.test(raw)) {
    return "Background sync didn't start. If you're on localhost, run pnpm inngest:dev in a second terminal, then try again.";
  }

  if (/(rate limit|secondary rate)/i.test(raw)) {
    return "GitHub rate limit reached. Wait a minute, then try again.";
  }

  if (/GitHub sync failed for (every|\d+ of)/i.test(raw)) {
    return raw;
  }

  if (/(404|not found)/i.test(raw)) {
    return "GitHub couldn't find one or more connected repos. Open Repositories, disconnect and reconnect each repo, then sync again.";
  }

  if (/(403|forbidden|resource not accessible)/i.test(raw)) {
    return "GitHub denied access to a connected repo. Check the app's repository permissions on GitHub.";
  }

  if (
    /(GITHUB_APP_ID|GITHUB_APP_PRIVATE_KEY|GITHUB_APP_NAME|BEGIN RSA PRIVATE KEY)/i.test(
      raw,
    )
  ) {
    return "GitHub App credentials are misconfigured on the server. Check GITHUB_APP_ID, GITHUB_APP_NAME, and GITHUB_APP_PRIVATE_KEY.";
  }

  if (/(not connected|token|credential|bad credentials)/i.test(raw)) {
    return "We couldn't reach GitHub. Reconnect the GitHub App and try again.";
  }

  if (raw.length <= 180) {
    return raw;
  }

  return "Sync couldn't finish. Please try again in a moment.";
}
