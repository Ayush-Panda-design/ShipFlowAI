"use client";

import { createAuthClient } from "better-auth/react";

import { getClientAuthBaseURL } from "@/lib/auth-url";

export const authClient = createAuthClient({
  baseURL: getClientAuthBaseURL(),
});

export const { signIn, signUp, signOut, useSession } = authClient;

export async function signInWithGithub(callbackUrl = "/") {
  return authClient.signIn.social({
    provider: "github",
    callbackURL: callbackUrl,
  });
}
