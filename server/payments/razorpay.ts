import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

export class PaymentError extends Error {
  constructor(message: string, readonly kind: "not-configured" | "gateway") {
    super(message);
  }
}

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new PaymentError("Online payments are not configured.", "not-configured");
  return { keyId, keySecret };
}

export const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

function client() {
  const { keyId, keySecret } = credentials();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

type GatewayError = { statusCode?: number; error?: { description?: string; code?: string } };
function gatewayError(error: unknown, action: string): PaymentError {
  const e = error as GatewayError;
  // 401 here means our own key pair is wrong, which is a server configuration problem, not the shopper's.
  console.error(`[razorpay] ${action} failed (${e?.statusCode ?? "no status"}): ${e?.error?.code ?? ""} ${e?.error?.description ?? String(error)}`);
  return new PaymentError("We couldn't start the online payment. Please try again or choose cash on delivery.", "gateway");
}

/** Amount is integer paise (minimum 100). `receipt` is our order number. */
export async function createRazorpayOrder(amountInPaise: number, receipt: string) {
  if (!Number.isInteger(amountInPaise) || amountInPaise < 100) throw new PaymentError("Amount must be at least ₹1.", "gateway");
  const { keyId } = credentials();
  try {
    const order = await client().orders.create({ amount: amountInPaise, currency: "INR", receipt });
    return { razorpayOrderId: order.id, amount: Number(order.amount), currency: order.currency, keyId };
  } catch (error) {
    throw gatewayError(error, "create order");
  }
}

/** HMAC-SHA256(order_id + "|" + payment_id, key_secret), compared in constant time. */
export function verifyPaymentSignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string): boolean {
  const { keySecret } = credentials();
  const expected = Buffer.from(createHmac("sha256", keySecret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const isWebhookConfigured = () => Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);

/**
 * Webhook signature: HMAC-SHA256 of the exact raw request body with the webhook secret (a different secret from the API
 * key secret; you choose it in the Razorpay dashboard). Compared in constant time.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Asks Razorpay whether this order has a captured payment. Covers shoppers who paid but closed the tab before we
 * could verify. Returns the payment id, or null if nothing was captured (or Razorpay could not be reached).
 */
export async function findCapturedPayment(razorpayOrderId: string): Promise<string | null> {
  try {
    const result = await client().orders.fetchPayments(razorpayOrderId);
    return result.items.find((payment) => payment.status === "captured")?.id ?? null;
  } catch (error) {
    gatewayError(error, "fetch payments");
    return null;
  }
}
