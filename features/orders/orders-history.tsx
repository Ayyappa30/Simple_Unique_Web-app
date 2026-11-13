"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatPrice } from "@/features/catalog/products";
import { ORDER_NUMBER_PATTERN, statusLabel, type ApiOrder } from "@/features/orders/order-types";
import { SiteHeader } from "@/features/storefront/site-header";
import { useShopSelector } from "@/store/provider";

export default function OrdersHistory() {
  const localOrders = useShopSelector((state) => state.orders);
  // Order numbers this device remembers (guest checkout); older browser-only orders have a different format and are skipped.
  const numbers = localOrders.map((order) => order.id).filter((id) => ORDER_NUMBER_PATTERN.test(id)).slice(0, 20).join(",");
  const [orders, setOrders] = useState<ApiOrder[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/v1/orders?numbers=${encodeURIComponent(numbers)}`, { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .then(({ ok, body }) => {
        if (!active) return;
        if (ok) setOrders(body.data);
        else setError(body.error ?? "We couldn’t load your orders.");
      })
      .catch(() => active && setError("We couldn’t reach the server."));
    return () => {
      active = false;
    };
  }, [numbers]);

  return <><SiteHeader/><main className="section"><span className="eyebrow">Your Simple & Unique</span><h1 className="serif">Order history</h1>
    <p className="account-intro">Sign in to see every order on your account. Orders you placed as a guest on this device appear here too.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    {orders === null && !error && <p aria-busy="true">Loading your orders…</p>}
    {orders && orders.length > 0 && <div className="order-history">{orders.map((order) => <Link href={`/orders/${order.orderNumber}`} className="history-row" key={order.id}><span><strong>{order.orderNumber}</strong><small>{new Date(order.createdAt).toLocaleDateString("en-IN")}</small></span><span>{order.paymentMethod !== "cod" && order.paymentStatus === "PENDING" && order.status === "PENDING" ? "Awaiting payment" : statusLabel(order.status)}</span><strong>{formatPrice(order.totalInPaise / 100)}</strong></Link>)}</div>}
    {orders && orders.length === 0 && <div className="empty-state"><h2 className="serif">Your next favourite is out there.</h2><p>Your orders will show up here after checkout.</p><Link className="button dark" href="/shop">Browse the collection</Link></div>}
  </main></>;
}
