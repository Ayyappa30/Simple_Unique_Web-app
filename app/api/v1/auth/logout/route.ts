import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/session";

export async function POST() {
  const response = NextResponse.json({ data: { ok: true } });
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
