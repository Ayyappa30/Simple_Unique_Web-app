import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { shipOrder } from "@/server/shipping/service";
import { shippingErrorResponse } from "@/server/shipping/http";

/** Books the courier (Shiprocket): creates the shipment, assigns a courier and tracking number, schedules pickup and makes the label. Safe to press again after a failure. */
export async function POST(_request: Request, ctx: RouteContext<"/api/v1/admin/orders/[id]/ship">) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ data: await shipOrder(id) });
  } catch (error) {
    return shippingErrorResponse(error, "book the courier");
  }
}
