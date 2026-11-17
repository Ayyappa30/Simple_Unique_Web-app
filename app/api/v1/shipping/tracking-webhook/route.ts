import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { applyShipmentUpdate } from "@/server/shipping/service";
import { isShippingWebhookConfigured } from "@/server/shipping/shiprocket";
import { fromWebhook } from "@/server/shipping/status";

// Shiprocket calls this on every tracking event. Set it up under Shiprocket > Settings > API > Webhooks, using the URL
// <your site>/api/v1/shipping/tracking-webhook and the same secret as SHIPROCKET_WEBHOOK_TOKEN (sent as the x-api-key header).
// Shiprocket asks for a 200 answer, so once the request is authenticated it always gets one.
const MAX_BODY = 1_000_000;

function tokenMatches(received: string | null) {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!isShippingWebhookConfigured()) return NextResponse.json({ error: "Shipping webhook is not configured." }, { status: 503 });
  if (!tokenMatches(request.headers.get("x-api-key"))) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return NextResponse.json({ error: "Too large." }, { status: 413 });

  const body: unknown = await request.json().catch(() => null);
  const update = fromWebhook(body);
  if (!update) return NextResponse.json({ ok: true, result: "ignored: not a tracking event" });
  try {
    const result = await applyShipmentUpdate(update);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    // Logged, and still answered with 200. "Refresh" in the admin picks up anything missed.
    console.error("[shipping] Could not apply tracking update", error);
    return NextResponse.json({ ok: false });
  }
}
