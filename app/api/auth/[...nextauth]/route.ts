import { handlers } from "@/auth";
import { safeError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

// Auth.js types this handler as NextRequest while Next.js route handlers may
// provide a plain Request. The runtime request is compatible; keep the cast at
// this adapter boundary rather than leaking it through the app.
export async function GET(request: Request) {
  return handlers.GET(request as NextRequest);
}

function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  // Auth.js owns its OAuth CSRF flow. Credentials sign-in is additionally
  // rate-limited by source IP; auth.ts applies a separate per-email backoff.
  if (new URL(request.url).pathname.endsWith("/signin/credentials")) {
    try {
      await enforceRateLimit(`auth:credentials:ip:${requestIp(request)}`, 20, 15 * 60);
    } catch (error) {
      return safeError(error, { route: "/api/auth/signin/credentials", method: "POST" });
    }
  }
  return handlers.POST(request as NextRequest);
}
