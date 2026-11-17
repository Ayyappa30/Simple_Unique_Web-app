import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { shippingSetupStatus } from "@/server/shipping/service";

/** Tells the admin whether Shiprocket is set up correctly (never returns credentials). */
export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json({ data: await shippingSetupStatus() }, { headers: { "Cache-Control": "private, no-store" } });
}
