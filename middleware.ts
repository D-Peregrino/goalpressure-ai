import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  pruneRateLimitBuckets,
  rateLimitResponse,
} from "@/lib/api/rateLimit";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

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

export const config = {
  matcher: "/api/:path*",
};
