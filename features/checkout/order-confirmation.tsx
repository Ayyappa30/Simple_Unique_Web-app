"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/features/catalog/products";
import { payWithRazorpay, type PaymentParams } from "@/features/checkout/razorpay";
import { paymentLabel, statusLabel, type ApiOrder } from "@/features/orders/order-types";
import { SiteHeader } from "@/features/storefront/site-header";

type State = { kind: "loading" } | { kind: "ready"; order: ApiOrder } | { kind: "missing" } | { kind: "error" };

export function OrderConfirmation({ id }: { id: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloads, setReloads] = useState(0);
  const [paying, setPaying] = useState(false);
  const [payMessage, setPayMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/orders/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then(async (response) => ({ status: response.status, body: await response.json().catch(() => ({})) }))
      .then(({ status, body }) => {
        if (!active) return;
        if (status === 200) setState({ kind: "ready", order: body.data });
        else setState({ kind: status === 404 ? "missing" : "error" });
      })
      .catch(() => active && setState({ kind: "error" }));
    return () => {
      active = false;
    };
  }, [id, reloads]);

  const order = state.kind === "ready" ? state.order : null;
  const awaitingPayment = !!order && order.paymentMethod === "razorpay" && order.paymentStatus === "PENDING" && order.status === "PENDING";

  async function payNow(current: ApiOrder) {
    setPaying(true);
    setPayMessage("");
    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(current.orderNumber)}/pay`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPayMessage(body.error ?? "We couldn't start the payment.");
        setReloads((n) => n + 1); // the order may have been paid or expired meanwhile
        return;
      }
      const outcome = await payWithRazorpay({
        orderNumber: current.orderNumber,
        params: body.data as PaymentParams,
        prefill: { name: current.customer.name, email: current.customer.email, contact: current.customer.phone },
        onFailedAttempt: (message) => setPayMessage(`Payment failed: ${message}`),
      });
      if (outcome.status === "failed") setPayMessage(outcome.message);
      if (outcome.status === "paid") setPayMessage("");
      setReloads((n) => n + 1);
    } catch {
      setPayMessage("Could not reach the server. Try again.");
    } finally {
      setPaying(false);
    }
  }

  return <><SiteHeader/><main className="confirmation section">
    <span className="eyebrow">{awaitingPayment ? "One more step" : "Thank you for choosing us"}</span>
    <h1 className="serif">{order ? (awaitingPayment ? "Complete your payment." : order.status === "CANCELLED" ? "This order was cancelled." : "Your order is in.") : state.kind === "loading" ? "Finding your order…" : "Order details"}</h1>
    {order && <>
      <p>{awaitingPayment ? "Your pieces are being held for you. Pay online to confirm your order; unpaid orders are released after an hour." : order.status === "CANCELLED" ? "If this is a surprise, contact us and we’ll help." : `We’ve saved your order and will send updates to ${order.customer.phone}.`}</p>
      <div className="order-confirm-card">
        <div className="summary-line"><strong>Order reference</strong><strong>{order.orderNumber}</strong></div>
        <div className="summary-line"><span>Status</span><span>{statusLabel(order.status)}</span></div>
        <div className="summary-line"><span>Payment</span><span>{paymentLabel(order)}</span></div>
        {order.trackingNumber && <div className="summary-line"><span>Tracking</span><span>{order.carrier ? `${order.carrier} · ` : ""}{order.trackingNumber}</span></div>}
        {order.items.map((item) => <div className="summary-line" key={item.productId}><span>{item.name} × {item.quantity}</span><span>{formatPrice((item.unitPriceInPaise * item.quantity) / 100)}</span></div>)}
        {order.discountInPaise > 0 && <div className="summary-line"><span>Discount</span><span>−{formatPrice(order.discountInPaise / 100)}</span></div>}
        <div className="summary-line"><span>Shipping</span><span>{order.shippingInPaise ? formatPrice(order.shippingInPaise / 100) : "Free"}</span></div>
        <div className="summary-line"><span>Total</span><strong>{formatPrice(order.totalInPaise / 100)}</strong></div>
      </div>
      <p>Delivery to {order.shipping.street}, {order.shipping.city}, {order.shipping.state} {order.shipping.pincode}</p>
      {awaitingPayment && <button className="button dark" type="button" disabled={paying} onClick={() => payNow(order)}>{paying ? "Opening payment…" : `Pay ${formatPrice(order.totalInPaise / 100)} now`}</button>}
      {payMessage && <p className="form-error" role="alert">{payMessage}</p>}
    </>}
    {state.kind === "missing" && <p>We couldn’t find this order. Check the order reference, or contact us if you need help.</p>}
    {state.kind === "error" && <p>We couldn’t load this order right now. Please refresh in a moment.</p>}
    <Link className="button dark" href="/account/orders">Track your order</Link>
  </main></>;
}
