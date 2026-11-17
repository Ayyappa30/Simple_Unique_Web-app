import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { refreshActiveShipments } from "@/server/shipping/service";
import { shippingErrorResponse } from "@/server/shipping/http";

/** Refreshes tracking for every parcel still on its way (a backup for the webhook). */
export async function POST() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  try {
    return NextResponse.json({ data: await refreshActiveShipments() });
  } catch (error) {
    return shippingErrorResponse(error, "refresh the shipments");
  }
}
