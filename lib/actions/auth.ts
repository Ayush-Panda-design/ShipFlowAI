"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { resolveCallbackUrl, SIGN_IN_PATH } from "@/lib/auth-proxy";

export async function signInWithEmail(
  email: string,
  password: string,
  callbackUrl?: string
) {
  const safeCallbackUrl = resolveCallbackUrl(callbackUrl);

  await auth.api.signInEmail({
    body: {
      email,
      password,
      callbackURL: safeCallbackUrl,
    },
  });

  redirect(safeCallbackUrl);
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
  callbackUrl?: string
) {
  const safeCallbackUrl = resolveCallbackUrl(callbackUrl);

  await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
      callbackURL: safeCallbackUrl,
    },
  });

  redirect(safeCallbackUrl);
}

export async function signOutAction() {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect(SIGN_IN_PATH);
}
