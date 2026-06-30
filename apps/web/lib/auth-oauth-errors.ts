const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  state_mismatch:
    "Your sign-in session expired or was interrupted. Close other ShipFlow tabs, then try again in one window.",
  invalid_code:
    "GitHub could not verify the sign-in. Confirm the OAuth app callback URL is exactly /api/auth/callback/github on your live domain, then try again.",
  invalid_callback_request:
    "GitHub returned an invalid sign-in response. Please try again.",
  oauth_provider_not_found:
    "GitHub sign-in is not configured on this site. Contact support.",
  unable_to_get_user_info:
    "Could not read your GitHub profile. Try again or check GitHub is not blocking the app.",
  email_not_found:
    "GitHub did not share an email address. In GitHub → Settings → Emails, allow email for apps, or make your primary email visible to authorized OAuth apps.",
  account_already_linked_to_different_user:
    "This GitHub account is already linked to another ShipFlow user. Sign in with that account or use a different GitHub account.",
  account_not_linked:
    "This GitHub email matches an existing ShipFlow account that was created with email/password. Sign in with email first, or use the same GitHub account you used before.",
  unable_to_link_account:
    "Could not link this GitHub account to your ShipFlow user. Try signing in again.",
  unable_to_create_user:
    "ShipFlow could not create your account. The database may be unavailable — try again in a minute.",
  unable_to_create_session:
    "Sign-in succeeded but the session could not be saved. Clear cookies for this site and try again.",
  internal_server_error:
    "ShipFlow could not reach the database during sign-in. Try again shortly.",
  signup_disabled: "New sign-ups are disabled on this site.",
  no_code: "GitHub sign-in was cancelled or incomplete. Please try again.",
  access_denied: "GitHub sign-in was cancelled. Please try again.",
  invalid_origin:
    "Sign-in was blocked because the site URL does not match server configuration. Contact support if this persists.",
  invalid_callback_url:
    "Sign-in redirect URL was rejected. Try again from the same domain you opened in your browser.",
};

function normalizeOAuthErrorCode(code: string) {
  return code.trim().toLowerCase().replace(/\s+/g, "_");
}

export function getOAuthErrorMessage(
  code: string | null | undefined,
  description?: string | null,
) {
  if (!code) {
    return null;
  }

  const normalized = normalizeOAuthErrorCode(code);
  const mapped = OAUTH_ERROR_MESSAGES[normalized];

  if (mapped) {
    return mapped;
  }

  if (description?.trim()) {
    return description.trim();
  }

  return `Sign-in failed (${normalized.replaceAll("_", " ")}). Please try again.`;
}
