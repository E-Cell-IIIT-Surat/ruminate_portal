import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { createHash } from "node:crypto";

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);
  const [bucket] = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("key", "count", "windowStart", "expiresAt")
    VALUES (${key}, 1, ${now}, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN ${now}
        ELSE "RateLimitBucket"."windowStart"
      END,
      "expiresAt" = CASE
        WHEN "RateLimitBucket"."expiresAt" <= ${now} THEN ${expiresAt}
        ELSE "RateLimitBucket"."expiresAt"
      END
    RETURNING "count"
  `;
  if ((bucket?.count ?? limit + 1) > limit)
    throw new AppError("Too many requests. Please try again shortly.", 429, "RATE_LIMITED");
}

function emailKey(email: string) {
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `auth:failed-email:${digest}`;
}

export async function assertAuthBackoff(email: string) {
  const bucket = await db.rateLimitBucket.findUnique({ where: { key: emailKey(email) } });
  if (bucket && bucket.expiresAt > new Date() && bucket.count >= 5)
    throw new AppError("Too many failed sign-in attempts. Try again in 15 minutes.", 429, "AUTH_BACKOFF");
}

export async function recordAuthFailure(email: string) {
  await enforceRateLimit(emailKey(email), 5, 15 * 60);
}

export async function clearAuthFailures(email: string) {
  await db.rateLimitBucket.deleteMany({ where: { key: emailKey(email) } });
}
