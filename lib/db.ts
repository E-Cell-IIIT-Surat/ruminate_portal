import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL ?? "postgresql://invalid:invalid@127.0.0.1:5432/invalid",
      // The local Cloudflare/Miniflare TCP shim is not reliable with a
      // multi-connection pool. Serialize database work through one socket so
      // RSC prefetches from several pages cannot exhaust the Worker runtime.
      max: process.env.CLOUDFLARE_DEV === "true" ? 1 : 5,
      // Close an idle socket quickly. Miniflare can retain a stale TCP socket
      // between fetches; forcing a fresh socket prevents the next RSC request
      // from waiting forever on that dead connection.
      idleTimeoutMillis: process.env.CLOUDFLARE_DEV === "true" ? 50 : 10_000,
      connectionTimeoutMillis: 10_000,
    }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
