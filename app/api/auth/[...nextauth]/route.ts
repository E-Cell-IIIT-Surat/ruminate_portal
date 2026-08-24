import { authConfig } from "@/auth";
import { Auth } from "@auth/core";
import { NextRequest } from "next/server";

type AuthRouteContext = {
  params?: Promise<{ nextauth?: string[] | string }> | { nextauth?: string[] | string };
};

const authBasePath = "/api/auth";

function asSegments(value: string[] | string | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : value.split("/");
}

async function createAuthRequest(request: NextRequest, context?: AuthRouteContext) {
  const requestUrl = new URL(request.url);
  const envUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.APP_URL;
  const canonicalOrigin = envUrl ? new URL(envUrl).origin : requestUrl.origin;
  const params = await context?.params;
  const segments = asSegments(params?.nextauth).filter(Boolean);

  // Vinext/Workers can hand Auth.js a route-pattern URL for catch-all routes.
  // Auth.js parses the action/provider from the real pathname, so rebuild the
  // canonical /api/auth/<action>/<provider> URL whenever params are available.
  if (segments.length > 0) {
    requestUrl.pathname = `${authBasePath}/${segments.map(encodeURIComponent).join("/")}`;
  }

  // Keep OAuth callback URLs stable in local Workers development. Without an
  // explicit AUTH_URL/NEXTAUTH_URL, Auth.js can infer https://localhost:3000
  // from forwarded Worker headers, which Google rejects unless registered.
  const canonicalUrl = new URL(requestUrl.toString());
  canonicalUrl.protocol = new URL(canonicalOrigin).protocol;
  canonicalUrl.host = new URL(canonicalOrigin).host;

  // Node's fetch implementation requires the explicit duplex flag when a
  // streaming request body is forwarded (Auth.js sign-in POSTs are streamed
  // by Vinext). Without it Vinext throws before Auth.js can parse the action.
  const requestInit: RequestInit & { duplex?: "half" } = {
    body: request.body,
    cache: request.cache,
    credentials: request.credentials,
    headers: request.headers,
    integrity: request.integrity,
    keepalive: request.keepalive,
    method: request.method,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal ?? undefined,
    ...(request.body ? { duplex: "half" as const } : {}),
  };
  // Auth.js consumes the standard Fetch Request; using it directly avoids a
  // Vinext-specific NextRequest type mismatch while preserving the duplex flag.
  return new Request(canonicalUrl.toString(), requestInit);
}

export async function GET(request: NextRequest, context: AuthRouteContext) {
  return Auth(await createAuthRequest(request, context), authConfig);
}

export async function POST(request: NextRequest, context: AuthRouteContext) {
  return Auth(await createAuthRequest(request, context), authConfig);
}
