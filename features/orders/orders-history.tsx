"use client";

import Link from "next/link";
import { formatPrice } from "@/features/catalog/products";
import { SiteHeader } from "@/features/storefront/site-header";
import { useShopSelector } from "@/store/provider";

export default function OrdersHistory() {
  const orders = useShopSelector((state) => state.orders);
  return <><SiteHeader/><main className="section"><span className="eyebrow">Your Simple & Unique</span><h1 className="serif">Order history</h1><p className="account-intro">Orders placed on this device appear here. Create an account when online authentication is configured to sync across devices.</p>{orders.length ? <div className="order-history">{orders.map((order) => <Link href={`/orders/${order.id}`} className="history-row" key={order.id}><span><strong>{order.id}</strong><small>{new Date(order.createdAt).toLocaleDateString("en-IN")}</small></span><span>{order.status}</span><strong>{formatPrice(order.total)}</strong></Link>)}</div> : <div className="empty-state"><h2 className="serif">Your next favourite is out there.</h2><p>Your orders will show up here after checkout.</p><Link className="button dark" href="/shop">Browse the collection</Link></div>}</main></>;
}
