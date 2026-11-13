import { NextResponse } from "next/server";
import { isRateLimited } from "@/server/auth/rate-limit";
import { paymentParamsFor, PaymentError } from "@/server/orders/payment-service";
import { OrderError } from "@/server/orders/repository";

// Returns the Razorpay parameters to (re)open the payment modal for an unpaid online order, e.g. after the shopper closed it.
export async function POST(request: Request, ctx: RouteContext<"/api/v1/orders/[orderNumber]/pay">) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(`order-pay:ip:${ip}`, 30, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }
  const { orderNumber } = await ctx.params;
  if (!/^SU-\d{4}-[A-Z0-9]{10}$/.test(orderNumber)) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  try {
    return NextResponse.json({ data: await paymentParamsFor(orderNumber) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: 500 });
    console.error("Failed to prepare payment", error);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again." }, { status: 503 });
  }
}
