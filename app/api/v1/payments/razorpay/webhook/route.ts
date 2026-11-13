import { NextResponse } from "next/server";
import { handleRazorpayEvent, type RazorpayWebhookEvent } from "@/server/orders/payment-service";
import { isWebhookConfigured, verifyWebhookSignature } from "@/server/payments/razorpay";

const MAX_BODY_BYTES = 256 * 1024;

// Razorpay calls this server-to-server (set the URL and secret in Dashboard > Account & Settings > Webhooks).
// 2xx = handled or safely ignored. 400 = bad signature. 5xx makes Razorpay retry later, which is what we want for outages.
export async function POST(request: Request) {
  if (!isWebhookConfigured()) return NextResponse.json({ error: "Webhooks are not configured." }, { status: 503 });

  // The signature covers the exact raw bytes, so read the text before parsing anything.
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  if (!verifyWebhookSignature(rawBody, request.headers.get("x-razorpay-signature") ?? "")) {
    console.error("[razorpay] Webhook rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const outcome = await handleRazorpayEvent(event);
    console.info(`[razorpay] Webhook ${event.event ?? "?"}: ${outcome}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[razorpay] Webhook ${event.event ?? "?"} failed`, error);
    return NextResponse.json({ error: "Could not process the event." }, { status: 500 });
  }
}
