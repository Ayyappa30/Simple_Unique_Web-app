import { after, NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { sendOrderEmail, type OrderEmailKind } from "@/server/email/order-emails";
import { ordersRepository } from "@/server/orders/repository";
import { updateOrderSchema } from "@/server/orders/schemas";
import { shippingErrorResponse } from "@/server/shipping/http";
import { cancelCourierBooking } from "@/server/shipping/service";

export async function PATCH(request: Request, ctx: RouteContext<"/api/v1/admin/orders/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  const parsed = updateOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  try {
    // Call off the courier first, so we never cancel an order while a courier is still coming to collect it.
    if (parsed.data.status === "CANCELLED") await cancelCourierBooking(id);
    const { order, previousStatus, previousTracking } = await ordersRepository.update(id, parsed.data);
    // Tell the customer about meaningful changes; emails are sent after the response and never fail the update.
    let kind: OrderEmailKind | null = null;
    if (order.status !== previousStatus) {
      kind = ({ SHIPPED: "shipped", DELIVERED: "delivered", CANCELLED: "cancelled", RETURNING: "returning", RETURNED: "returned" } as Partial<Record<typeof order.status, OrderEmailKind>>)[order.status] ?? null;
    } else if (order.status === "SHIPPED" && order.trackingNumber && order.trackingNumber !== previousTracking) {
      kind = "shipped"; // tracking number added or changed after shipping
    }
    if (kind) {
      const emailKind = kind;
      after(() => sendOrderEmail(emailKind, order));
    }
    return NextResponse.json({ data: order });
  } catch (error) {
    return shippingErrorResponse(error, "update the order");
  }
}
