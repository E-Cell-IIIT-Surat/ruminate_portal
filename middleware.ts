import { NextResponse, type NextRequest } from "next/server";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && !safeMethods.has(request.method)) {
    const isAuth = request.nextUrl.pathname.startsWith("/api/auth/") && request.nextUrl.pathname !== "/api/auth/signup";
    const isInternal = request.nextUrl.pathname.startsWith("/api/internal/");
    if (!isAuth && !isInternal) {
      const fetchSite = request.headers.get("sec-fetch-site");
      const origin = request.headers.get("origin");
      let crossOrigin = false;
      if (origin) {
        try {
          crossOrigin = new URL(origin).origin !== request.nextUrl.origin;
        } catch {
          crossOrigin = true;
        }
      }
      if (fetchSite === "cross-site" || crossOrigin)
        return NextResponse.json({ error: "Cross-site request rejected", code: "CSRF_REJECTED" }, { status: 403 });
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = { matcher: "/((?!_next/static|_next/image|favicon.ico).*)" };
