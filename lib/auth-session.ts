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
  let session;

  try {
    session = await getServerSession();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth] requireSession failed:", error);
    }

    const destination = callbackPath ?? DEFAULT_POST_AUTH_PATH;
    redirect(
      `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(destination)}`
    );
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
  const session = await getServerSession();

  if (session) {
    redirect(resolveCallbackUrl(callbackUrl, DEFAULT_POST_AUTH_PATH));
  }
}
