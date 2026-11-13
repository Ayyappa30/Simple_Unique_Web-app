import { after, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { sendOrderEmail, type OrderEmailKind } from "@/server/email/order-emails";
import { ordersRepository, OrderError } from "@/server/orders/repository";
import { updateOrderSchema } from "@/server/orders/schemas";

export async function PATCH(request: Request, ctx: RouteContext<"/api/v1/admin/orders/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  const parsed = updateOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  try {
    const { order, previousStatus, previousTracking } = await ordersRepository.update(id, parsed.data);
    // Tell the customer about meaningful changes; emails are sent after the response and never fail the update.
    let kind: OrderEmailKind | null = null;
    if (order.status !== previousStatus) {
      kind = order.status === "SHIPPED" ? "shipped" : order.status === "DELIVERED" ? "delivered" : order.status === "CANCELLED" ? "cancelled" : null;
    } else if (order.status === "SHIPPED" && order.trackingNumber && order.trackingNumber !== previousTracking) {
      kind = "shipped"; // tracking number added or changed after shipping
    }
    if (kind) {
      const emailKind = kind;
      after(() => sendOrderEmail(emailKind, order));
    }
    return NextResponse.json({ data: order });
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to update order", error);
    return NextResponse.json({ error: "Could not update the order. Please try again." }, { status: 503 });
  }
}
