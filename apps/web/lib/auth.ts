import { betterAuth } from "better-auth/minimal";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { getPrismaClient } from "@repo/database";

import {
  getAuthAllowedHosts,
  getAuthProtocol,
  getAuthTrustedOrigins,
} from "@/lib/auth-env";

const authPrisma = getPrismaClient();

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: {
    allowedHosts: getAuthAllowedHosts(),
    protocol: getAuthProtocol(),
  },
  database: prismaAdapter(authPrisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  trustedOrigins: getAuthTrustedOrigins(),
  plugins: [nextCookies()],
});
