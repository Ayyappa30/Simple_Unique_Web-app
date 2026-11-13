import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";
import { isRateLimited } from "@/server/auth/rate-limit";
import { sendOrderEmail } from "@/server/email/order-emails";
import { beginOnlinePayment, isRazorpayConfigured, PaymentError, releaseExpiredPayments } from "@/server/orders/payment-service";
import { ordersRepository, OrderError } from "@/server/orders/repository";
import { orderLookupSchema, placeOrderSchema } from "@/server/orders/schemas";

const clientIp = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
const noStore = { "Cache-Control": "private, no-store" };

// Guest checkout is allowed; if the shopper is signed in the order is linked to their account.
export async function POST(request: Request) {
  const parsed = placeOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check your details." }, { status: 400 });
  if (isRateLimited(`order:ip:${clientIp(request)}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many orders from this connection. Please try again later." }, { status: 429 });
  }
  if (parsed.data.paymentMethod === "razorpay" && !isRazorpayConfigured()) {
    return NextResponse.json({ error: "Online payments aren't available right now. Please choose cash on delivery." }, { status: 503 });
  }
  try {
    // Housekeeping: free stock held by online orders that were never paid (best effort).
    await releaseExpiredPayments().catch((error) => console.error("Could not release expired payments", error));
    const user = await getCurrentUser().catch(() => null);
    const order = await ordersRepository.place({ ...parsed.data, userId: user?.id });
    if (order.paymentMethod === "razorpay") {
      // Payment parameters for the Razorpay modal. The confirmation email is sent once the payment is verified.
      const payment = await beginOnlinePayment(order);
      return NextResponse.json({ data: order, payment }, { status: 201, headers: noStore });
    }
    after(() => sendOrderEmail("placed", order));
    return NextResponse.json({ data: order }, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof PaymentError) return NextResponse.json({ error: error.message }, { status: 500 });
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to place order", error);
    return NextResponse.json({ error: "We couldn't place your order. Please try again." }, { status: 503 });
  }
}

// ?numbers=SU-2026-AAAA...,SU-... : orders this device remembers. Signed-in users also get their account's orders.
export async function GET(request: Request) {
  if (isRateLimited(`order-list:ip:${clientIp(request)}`, 60, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }
  const raw = new URL(request.url).searchParams.get("numbers");
  const parsed = orderLookupSchema.safeParse({ numbers: raw ? raw.split(",").map((value) => value.trim()).filter(Boolean) : [] });
  if (!parsed.success) return NextResponse.json({ error: "Invalid order numbers." }, { status: 400 });
  try {
    const user = await getCurrentUser().catch(() => null);
    const data = await ordersRepository.listMine(user?.id, parsed.data.numbers);
    return NextResponse.json({ data }, { headers: noStore });
  } catch (error) {
    console.error("Failed to list orders", error);
    return NextResponse.json({ error: "Orders are temporarily unavailable." }, { status: 503 });
  }
}
