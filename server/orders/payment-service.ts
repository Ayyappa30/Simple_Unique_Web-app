import { after } from "next/server";
import { sendOrderEmail } from "@/server/email/order-emails";
import { createRazorpayOrder, findCapturedPayment, isRazorpayConfigured, verifyPaymentSignature, PaymentError } from "@/server/payments/razorpay";
import { ordersRepository, OrderError } from "./repository";

/** How long an unpaid online order keeps its stock reserved. */
export const PAYMENT_HOLD_MS = 60 * 60_000;

export { isRazorpayConfigured, PaymentError };

/** Create the Razorpay order for an order we just saved; if that fails, cancel the order so its stock is released. */
export async function beginOnlinePayment(order: { id: string; orderNumber: string; totalInPaise: number }) {
  try {
    const payment = await createRazorpayOrder(order.totalInPaise, order.orderNumber);
    await ordersRepository.attachRazorpayOrder(order.id, payment.razorpayOrderId);
    return payment;
  } catch (error) {
    await ordersRepository.update(order.id, { status: "CANCELLED" }).catch((e) => console.error("Could not release stock for failed payment start", e));
    throw error;
  }
}

/** Verify Razorpay's signature, then mark the order paid. Throws OrderError(400) on a bad signature and never marks it paid. */
export async function verifyAndMarkPaid(input: { orderNumber: string; razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const order = await ordersRepository.paymentContext(input.orderNumber);
  if (!order || order.paymentMethod !== "razorpay" || !order.razorpayOrderId || order.razorpayOrderId !== input.razorpay_order_id) {
    throw new OrderError("Payment details do not match this order.", 400);
  }
  if (!verifyPaymentSignature(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
    console.error(`[razorpay] Signature mismatch for ${order.orderNumber}`);
    throw new OrderError("Payment could not be verified.", 400);
  }
  const result = await ordersRepository.markPaid(order.orderNumber, input.razorpay_payment_id);
  if (result.newlyPaid && result.order.status !== "CANCELLED") after(() => sendOrderEmail("placed", result.order));
  if (result.order.status === "CANCELLED") {
    // The shopper paid after the hold expired. Flag it loudly: this payment needs a manual refund in the Razorpay dashboard.
    console.error(`[razorpay] Payment ${input.razorpay_payment_id} received for CANCELLED order ${order.orderNumber}. Refund it manually.`);
    throw new OrderError("This order expired before the payment arrived. Your payment will be refunded; please contact us if it isn't.", 409);
  }
  return result.order;
}

/** If Razorpay already captured a payment (shopper paid, then closed the tab), mark the order paid. */
export async function reconcileOrder(orderNumber: string): Promise<boolean> {
  const order = await ordersRepository.paymentContext(orderNumber);
  if (!order || order.paymentMethod !== "razorpay" || order.paymentStatus !== "PENDING" || order.status !== "PENDING" || !order.razorpayOrderId) return false;
  const paymentId = await findCapturedPayment(order.razorpayOrderId);
  if (!paymentId) return false;
  const result = await ordersRepository.markPaid(order.orderNumber, paymentId);
  if (result.newlyPaid) after(() => sendOrderEmail("placed", result.order));
  return true;
}

/** Cancel (and restock) online orders that were never paid within the hold time, after checking Razorpay one last time. */
export async function releaseExpiredPayments() {
  const stale = await ordersRepository.staleUnpaidOnline(new Date(Date.now() - PAYMENT_HOLD_MS));
  for (const { orderNumber } of stale) {
    if (await reconcileOrder(orderNumber)) continue;
    const order = await ordersRepository.paymentContext(orderNumber);
    if (order) await ordersRepository.update(order.id, { status: "CANCELLED" });
  }
}

/** Payment parameters to (re)open the Razorpay modal for an unpaid online order. */
export async function paymentParamsFor(orderNumber: string) {
  if (await reconcileOrder(orderNumber)) throw new OrderError("This order has already been paid.", 409);
  const order = await ordersRepository.paymentContext(orderNumber);
  if (!order) throw new OrderError("Order not found.", 404);
  if (order.paymentMethod !== "razorpay" || order.paymentStatus !== "PENDING" || order.status !== "PENDING" || !order.razorpayOrderId) {
    throw new OrderError("This order doesn't need a payment.", 409);
  }
  if (order.createdAt.getTime() < Date.now() - PAYMENT_HOLD_MS) {
    await ordersRepository.update(order.id, { status: "CANCELLED" });
    throw new OrderError("This order expired because it wasn't paid in time. Please place a new order.", 409);
  }
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new PaymentError("Online payments are not configured.", "not-configured");
  return { razorpayOrderId: order.razorpayOrderId, amount: order.totalInPaise, currency: "INR", keyId };
}

// ---------- Razorpay webhooks ----------

type WebhookPayment = { id?: string; order_id?: string; amount?: number; currency?: string; error_description?: string };
export type RazorpayWebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: WebhookPayment };
    refund?: { entity?: { payment_id?: string; amount?: number } };
  };
};

/**
 * Applies a signature-verified webhook event. Safe to receive more than once and in any order relative to the browser's
 * own verify call: marking paid is idempotent. Events that aren't about one of our orders are ignored.
 */
export async function handleRazorpayEvent(event: RazorpayWebhookEvent): Promise<string> {
  switch (event.event) {
    case "payment.captured":
    case "order.paid": {
      const payment = event.payload?.payment?.entity;
      if (!payment?.id || !payment.order_id) return "ignored: no payment details";
      const order = await ordersRepository.paymentContextByRazorpayOrderId(payment.order_id);
      if (!order) return "ignored: not one of our orders";
      // Defense in depth: never trust an amount that doesn't match what we charged.
      if (payment.amount !== order.totalInPaise || (payment.currency ?? "INR") !== "INR") {
        console.error(`[razorpay] Webhook amount mismatch for ${order.orderNumber}: got ${payment.amount} ${payment.currency}, expected ${order.totalInPaise} INR`);
        return "ignored: amount mismatch";
      }
      const result = await ordersRepository.markPaid(order.orderNumber, payment.id);
      if (result.order.status === "CANCELLED") {
        console.error(`[razorpay] Payment ${payment.id} captured for CANCELLED order ${order.orderNumber}. Refund it manually in the Razorpay dashboard.`);
        return "paid cancelled order: needs refund";
      }
      if (result.newlyPaid) after(() => sendOrderEmail("placed", result.order));
      return result.newlyPaid ? "marked paid" : "already paid";
    }
    case "payment.failed": {
      const payment = event.payload?.payment?.entity;
      console.info(`[razorpay] Payment failed for Razorpay order ${payment?.order_id ?? "?"}: ${payment?.error_description ?? "no reason given"}`);
      return "noted: payment failed";
    }
    case "refund.processed": {
      const refund = event.payload?.refund?.entity;
      if (!refund?.payment_id || typeof refund.amount !== "number") return "ignored: no refund details";
      return (await ordersRepository.markRefunded(refund.payment_id, refund.amount)) ? "marked refunded" : "ignored: no full refund applied";
    }
    default:
      return `ignored: ${event.event ?? "unknown"} event`;
  }
}
