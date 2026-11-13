import { NextResponse } from "next/server";
import { isRateLimited } from "@/server/auth/rate-limit";
import { verifyAndMarkPaid } from "@/server/orders/payment-service";
import { OrderError } from "@/server/orders/repository";
import { verifyPaymentSchema } from "@/server/orders/schemas";

// Called by the browser after the Razorpay modal succeeds. Marks the order paid only if the signature is valid.
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (isRateLimited(`pay-verify:ip:${ip}`, 30, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }
  const parsed = verifyPaymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  try {
    const order = await verifyAndMarkPaid(parsed.data);
    return NextResponse.json({ data: { orderNumber: order.orderNumber, paymentStatus: order.paymentStatus } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Payment verification failed", error);
    return NextResponse.json({ error: "We couldn't confirm your payment yet. If you were charged, your order will update shortly." }, { status: 503 });
  }
}
