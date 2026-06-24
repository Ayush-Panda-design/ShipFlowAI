import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "./generated/prisma/client";

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

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: url,
    max: 5,
    // Neon can take several seconds to wake from idle.
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
  const pool = globalForPrisma.pool ?? createPool();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;

  if (cached && "gitHubInstallation" in cached && "pullRequest" in cached) {
    return cached;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export async function invalidateDbConnection() {
  const pool = globalForPrisma.pool;
  if (pool) {
    await pool.end().catch(() => undefined);
    globalForPrisma.pool = undefined;
  }

  globalForPrisma.prisma = undefined;
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
