import { NextResponse } from "next/server";
import { isRateLimited } from "@/server/auth/rate-limit";
import { reconcileOrder } from "@/server/orders/payment-service";
import { ordersRepository } from "@/server/orders/repository";

// The order number is a long random code, so it acts like a private link for guest shoppers.
export async function GET(request: Request, ctx: RouteContext<"/api/v1/orders/[orderNumber]">) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(`order-view:ip:${ip}`, 60, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }
  const { orderNumber } = await ctx.params;
  if (!/^SU-\d{4}-[A-Z0-9]{10}$/.test(orderNumber)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  try {
    // If the shopper paid and then closed the tab, Razorpay already has the payment: pick it up when they come back.
    await reconcileOrder(orderNumber).catch(() => false);
    const order = await ordersRepository.findByNumber(orderNumber);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ data: order }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to load order", error);
    return NextResponse.json({ error: "Orders are temporarily unavailable." }, { status: 503 });
  }
}
