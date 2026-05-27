import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  pruneRateLimitBuckets,
  rateLimitResponse,
} from "@/lib/api/rateLimit";
import { isAuthPage, isProtectedPath } from "@/lib/auth/routes";
import { SB_ACCESS_COOKIE, SB_REFRESH_COOKIE } from "@/lib/supabase/session-cookie-names";

function hasSessionCookie(request: NextRequest): boolean {
  if (request.cookies.get("gp_dev_user_id")?.value) return true;
  if (request.cookies.get(SB_ACCESS_COOKIE)?.value) return true;
  if (request.cookies.get(SB_REFRESH_COOKIE)?.value) return true;

  for (const cookie of request.cookies.getAll()) {
    const name = cookie.name.toLowerCase();
    if (name.includes("auth-token") && name.startsWith("sb-")) return true;
  }
  return false;
}

/** Módulos experimentais — redirecionados para o terminal core. */
const CORE_HIDDEN_PATHS = [
  "/ops",
  "/network",
  "/replay",
  "/admin/quant",
  "/backtest",
  "/validation",
  "/research",
  "/analytics",
  "/feed",
  "/models",
] as const;

function isCoreHiddenPath(pathname: string): boolean {
  return CORE_HIDDEN_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isCoreHiddenPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/terminal";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/api/")) {
    pruneRateLimitBuckets();
    const result = checkRateLimit(request, pathname);
    if (!result.allowed) {
      return rateLimitResponse(result);
    }
    const response = NextResponse.next();
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    return response;
  }

  if (isProtectedPath(pathname) && !hasSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage(pathname) && hasSessionCookie(request)) {
    // Cookies podem estar expirados: ?reauth=1 mantém /entrar acessível para login real.
    if (request.nextUrl.searchParams.get("reauth") === "1") {
      return NextResponse.next();
    }
    const redirect = request.nextUrl.searchParams.get("redirect") ?? "/terminal";
    const url = request.nextUrl.clone();
    url.pathname = redirect.startsWith("/") ? redirect : "/terminal";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/conta", "/conta/:path*", "/account", "/account/:path*", "/admin/:path*", "/entrar", "/cadastro", "/login", "/signup"],
};
