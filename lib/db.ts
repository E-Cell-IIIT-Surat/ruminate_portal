import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "Production database configuration is missing: DATABASE_URL must be set in the runtime environment.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Production database configuration is invalid: DATABASE_URL must be a PostgreSQL URL.");
  }

  if (!["postgresql:", "postgres:"].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error("Production database configuration is invalid: DATABASE_URL must use postgresql://.");
  }

  if (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
    throw new Error("Production database configuration is invalid: DATABASE_URL points to localhost.");
  }

  return value;
}

const databaseUrl = requireDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
