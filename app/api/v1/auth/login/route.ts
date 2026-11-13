import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { verifyPassword } from "@/server/auth/password";
import { clearRateLimit, isRateLimited } from "@/server/auth/rate-limit";
import { loginSchema } from "@/server/auth/schemas";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/server/auth/session";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const { email, password } = parsed.data;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const keys = [`login:ip:${ip}`, `login:email:${email}`];
  if (keys.some((key) => isRateLimited(key))) {
    return NextResponse.json({ error: "Too many attempts. Please try again in a few minutes." }, { status: 429 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = await verifyPassword(password, user?.passwordHash);
    if (!user || !valid) return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });

    keys.forEach(clearRateLimit);
    const response = NextResponse.json({ data: { id: user.id, name: user.name, role: user.role } });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user.id, user.role), sessionCookieOptions);
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 503 });
  }
}
