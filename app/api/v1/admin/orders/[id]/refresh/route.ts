import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { refreshOrder } from "@/server/shipping/service";
import { shippingErrorResponse } from "@/server/shipping/http";

/** Asks Shiprocket for the latest tracking of one order and applies it. */
export async function POST(_request: Request, ctx: RouteContext<"/api/v1/admin/orders/[id]/refresh">) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ data: await refreshOrder(id) });
  } catch (error) {
    return shippingErrorResponse(error, "refresh the tracking");
  }
}
