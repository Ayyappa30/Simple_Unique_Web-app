import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { isRateLimited } from "@/server/auth/rate-limit";

const schema = z.object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()) });

// Newsletter signup. Always answers the same way for new and existing addresses, so it can't be used to find out who has subscribed.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(`newsletter:ip:${ip}`, 8, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  try {
    await prisma.newsletterSubscriber.upsert({ where: { email: parsed.data.email }, create: { email: parsed.data.email }, update: {} });
    return NextResponse.json({ data: { subscribed: true } });
  } catch (error) {
    console.error("Newsletter signup failed", error);
    return NextResponse.json({ error: "We couldn't sign you up just now. Please try again." }, { status: 503 });
  }
}
