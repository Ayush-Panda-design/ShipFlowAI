import { headers } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { withDbRetry } from "@/lib/db";
import { resolveCallbackUrl, SIGN_IN_PATH, DEFAULT_POST_AUTH_PATH } from "@/lib/auth-proxy";

async function fetchServerSession() {
  const requestHeaders = await headers();

  return withDbRetry(() =>
    auth.api.getSession({
      headers: requestHeaders,
    })
  );
}

export const getServerSession = cache(fetchServerSession);

export async function requireSession(callbackPath?: string) {
  let session = null;

  try {
    session = await getServerSession();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth] requireSession failed:", error);
    }
  }

  if (!session) {
    const destination = callbackPath ?? DEFAULT_POST_AUTH_PATH;
    redirect(
      `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(destination)}`
    );
  }

  return session;
}

export async function redirectIfAuthenticated(callbackUrl?: string | null) {
  let session = null;

  try {
    session = await getServerSession();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth] redirectIfAuthenticated failed:", error);
    }
    // Allow sign-in page when the database is temporarily unavailable.
    return;
  }

  if (session) {
    redirect(resolveCallbackUrl(callbackUrl, DEFAULT_POST_AUTH_PATH));
  }
}
