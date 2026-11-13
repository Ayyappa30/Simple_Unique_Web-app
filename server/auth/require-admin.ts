import { NextResponse } from "next/server";
import { getCurrentUser, type CurrentUser } from "./current-user";

/** Use at the top of every admin route handler: `const admin = await requireAdmin(); if (admin instanceof NextResponse) return admin;` */
export async function requireAdmin(): Promise<CurrentUser | NextResponse> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  return user;
}
