import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/server/auth/session";

// Optimistic gate for /admin: checks the signed cookie only (no DB access here).
export function proxy(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (session?.role === "ADMIN") return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  if (session) login.searchParams.set("denied", "1");
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/admin/:path*"] };
