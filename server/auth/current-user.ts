import { cookies } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { SESSION_COOKIE, verifySessionToken } from "./session";

export type CurrentUser = { id: string; name: string; email: string | null; role: "CUSTOMER" | "ADMIN" };

/** Reads the session cookie and re-checks the user (and current role) in the database. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.sub }, select: { id: true, name: true, email: true, role: true } });
}
