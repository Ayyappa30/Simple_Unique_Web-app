import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "su_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export type Role = "CUSTOMER" | "ADMIN";
export type SessionPayload = { sub: string; role: Role; exp: number };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  return value;
}

const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function createSessionToken(userId: string, role: Role): string {
  const payload: SessionPayload = { sub: userId, role, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.sub !== "string" || (payload.role !== "CUSTOMER" && payload.role !== "ADMIN")) return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
