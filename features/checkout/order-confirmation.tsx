"use client";

import Link from "next/link";
import { formatPrice } from "@/features/catalog/products";
import { SiteHeader } from "@/features/storefront/site-header";
import { useShopSelector } from "@/store/provider";

export function OrderConfirmation({ id }: { id: string }) {
  const order = useShopSelector((state) => state.orders.find((item) => item.id === id));
  return <><SiteHeader/><main className="confirmation section"><span className="eyebrow">Thank you for choosing us</span><h1 className="serif">Your order is in.</h1>{order ? <><p>We’ve saved your order and will send updates to {order.phone}.</p><div className="order-confirm-card"><div className="summary-line"><strong>Order reference</strong><strong>{order.id}</strong></div><div className="summary-line"><span>Status</span><span>{order.status}</span></div><div className="summary-line"><span>Payment</span><span>Cash on delivery</span></div><div className="summary-line"><span>Total</span><strong>{formatPrice(order.total)}</strong></div></div><p>Delivery to {order.city}, {order.state} {order.pincode}</p></> : <p>This order is not saved in this browser. If you placed it on another device, contact us with your order reference.</p>}<Link className="button dark" href="/account/orders">Track your order</Link></main></>;
}
