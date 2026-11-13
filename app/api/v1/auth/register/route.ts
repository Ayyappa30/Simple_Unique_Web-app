import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { hashPassword } from "@/server/auth/password";
import { isRateLimited } from "@/server/auth/rate-limit";
import { registerSchema } from "@/server/auth/schemas";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/server/auth/session";

export async function POST(request: Request) {
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your details." }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(`register:ip:${ip}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many sign-ups. Please try again later." }, { status: 429 });
  }
  const { name, email, password } = parsed.data;
  try {
    // Customers only: the ADMIN role can never be set through this endpoint.
    const user = await prisma.user.create({
      data: { name, email, passwordHash: await hashPassword(password), role: "CUSTOMER" },
      select: { id: true, name: true, role: true },
    });
    const response = NextResponse.json({ data: user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, createSessionToken(user.id, user.role), sessionCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
    }
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Sign-up is temporarily unavailable." }, { status: 503 });
  }
}
