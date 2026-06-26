import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "./generated/prisma/client";

function loadDatabaseEnv() {
  if (process.env.DATABASE_URL) {
    return;
  }

  const candidates = [
    resolve(process.cwd(), "apps/web/.env"),
    resolve(process.cwd(), "../../apps/web/.env"),
    resolve(process.cwd(), ".env"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path });
      if (process.env.DATABASE_URL) {
        return;
      }
    }
  }
}

loadDatabaseEnv();

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function isConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("connection") ||
    message.includes("terminated") ||
    message.includes("timeout") ||
    message.includes("econnreset")
  );
}

function isNeonDatabaseUrl(url: string) {
  return url.includes("neon.tech");
}

function normalizeDatabaseUrl(url: string) {
  const legacySslModes = ["require", "prefer", "verify-ca"];

  try {
    const parsed = new URL(url);
    const sslmode = parsed.searchParams.get("sslmode");

    if (sslmode && legacySslModes.includes(sslmode)) {
      parsed.searchParams.set("sslmode", "verify-full");
    }

    if (
      isNeonDatabaseUrl(parsed.hostname) &&
      !parsed.searchParams.has("connect_timeout")
    ) {
      parsed.searchParams.set("connect_timeout", "15");
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function createPgPool(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 60_000,
    allowExitOnIdle: false,
  });

  pool.on("error", (error) => {
    if (process.env.NODE_ENV === "development") {
      console.error("[db] pool error:", error.message);
    }
  });

  return pool;
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = normalizeDatabaseUrl(url);

  if (isNeonDatabaseUrl(connectionString)) {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({ adapter });
  }

  const pool = globalForPrisma.pool ?? createPgPool(connectionString);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function isClientComplete(client: PrismaClient) {
  return "session" in client && "workspace" in client && "pullRequest" in client;
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;

  if (cached && isClientComplete(cached)) {
    return cached;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export { getPrismaClient };

export async function invalidateDbConnection() {
  const client = globalForPrisma.prisma;
  if (client) {
    await client.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
  }

  const pool = globalForPrisma.pool;
  if (pool) {
    await pool.end().catch(() => undefined);
    globalForPrisma.pool = undefined;
  }
}

export async function withDbRetry<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }

    await invalidateDbConnection();
    return operation();
  }
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = client[prop as keyof PrismaClient];

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
});

export type { PrismaClient } from "./generated/prisma/client";
