import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const existing = await db.rateLimitBucket.findUnique({ where: { key } });
  if (!existing || existing.expiresAt <= now) {
    await db.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, windowStart: now, expiresAt: new Date(now.getTime() + windowSeconds * 1000) },
      update: { count: 1, windowStart: now, expiresAt: new Date(now.getTime() + windowSeconds * 1000) },
    });
    return;
  }
  const updated = await db.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
  if (updated.count > limit) throw new AppError("Too many requests. Please try again shortly.", 429, "RATE_LIMITED");
}
