import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@repo/database";

import { getAuthConfigErrors } from "@/lib/auth-config";
import {
  getAuthAllowedHosts,
  getAuthBaseUrl,
  getAuthProtocol,
  getAuthTrustedOrigins,
} from "@/lib/auth-env";

const githubClientId = process.env.GITHUB_CLIENT_ID?.trim();
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

type GitHubProfile = {
  id: string | number;
  login?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

function githubPlaceholderEmail(profile: GitHubProfile) {
  const login = profile.login?.trim();
  if (login) {
    return `${profile.id}+${login}@users.noreply.github.com`;
  }
  return `${profile.id}@users.noreply.github.com`;
}

const authConfigErrors = getAuthConfigErrors();
if (authConfigErrors.length > 0 && process.env.NODE_ENV === "development") {
  console.warn("[auth] configuration issues:", authConfigErrors.join("; "));
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: {
    allowedHosts: getAuthAllowedHosts(),
    protocol: getAuthProtocol(),
    fallback: getAuthBaseUrl(),
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github"],
    },
  },
  socialProviders: {
    ...(githubClientId && githubClientSecret
      ? {
          github: {
            clientId: githubClientId,
            clientSecret: githubClientSecret,
            scope: ["read:user", "user:email"],
            mapProfileToUser: (profile) => {
              const githubProfile = profile as GitHubProfile;
              const email =
                githubProfile.email?.trim() || githubPlaceholderEmail(githubProfile);

              return {
                email,
                name:
                  githubProfile.name?.trim() ||
                  githubProfile.login?.trim() ||
                  "GitHub User",
                image: githubProfile.image ?? undefined,
                emailVerified: Boolean(githubProfile.email?.trim()),
              };
            },
          },
        }
      : {}),
  },
  trustedOrigins: getAuthTrustedOrigins(),
  onAPIError: {
    errorURL: "/sign-in",
  },
  plugins: [nextCookies()],
});
