"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { placeOrder } from "@/features/shop/shop-slice";
import { payWithRazorpay, type PaymentParams } from "@/features/checkout/razorpay";
import type { ApiOrder } from "@/features/orders/order-types";
import { formatPrice } from "@/features/catalog/products";
import { SiteHeader } from "@/features/storefront/site-header";
import { useShopDispatch, useShopSelector } from "@/store/provider";

const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().email("Enter a valid email address"),
  address: z.string().trim().min(8, "Enter your complete street address"),
  city: z.string().trim().min(2, "Enter your city"),
  state: z.string().trim().min(2, "Enter your state"),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
});
type CheckoutField = keyof z.infer<typeof checkoutSchema>;

export function CheckoutPage({ coupon }: { coupon: string }) {
  const router = useRouter();
  const dispatch = useShopDispatch();
  const { cart, products } = useShopSelector((state) => state);
  const [errors, setErrors] = useState<Partial<Record<CheckoutField, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [inventoryError, setInventoryError] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [method, setMethod] = useState<"razorpay" | "cod">("cod");
  const subtotal = cart.reduce((sum, line) => sum + (products.find((p) => p.id === line.productId)?.price ?? 0) * line.quantity, 0);
  const safeDiscount = coupon.toUpperCase() === "UNIQUE10" && subtotal >= 999 ? Math.min(Math.round(subtotal * .1), 500) : 0;
  const shipping = subtotal - safeDiscount >= 1499 || subtotal === 0 ? 0 : 99;
  const total = subtotal - safeDiscount + shipping;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const parsed = checkoutSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors as Partial<Record<CheckoutField, string>>);
      return;
    }
    if (!cart.length || submitting) return;
    const unavailable = cart.find((line) => {
      const product = products.find((item) => item.id === line.productId);
      return !product || product.stock < line.quantity;
    });
    if (unavailable) {
      setInventoryError("A piece in your bag is no longer available in that quantity. Please return to your bag and update it.");
      return;
    }
    setInventoryError("");
    setErrors({});
    setSubmitting(true);
    try {
      // The server re-checks prices, discount and stock; the totals shown here are only a preview.
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: parsed.data.name, phone: parsed.data.phone, email: parsed.data.email },
          address: { street: parsed.data.address, city: parsed.data.city, state: parsed.data.state, pincode: parsed.data.pincode },
          items: cart.map(({ productId, quantity }) => ({ productId, quantity })),
          coupon: coupon || undefined,
          paymentMethod: method,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setInventoryError(result.error ?? "We couldn't place your order. Please try again.");
        setSubmitting(false);
        return;
      }
      const order = result.data as ApiOrder;
      // Remember the order on this device (guest history) and clear the bag.
      dispatch(placeOrder({
        id: order.orderNumber, customerName: order.customer.name, phone: order.customer.phone, email: order.customer.email,
        address: order.shipping.street, city: order.shipping.city, state: order.shipping.state, pincode: order.shipping.pincode,
        paymentMethod: "cod", status: "Pending", total: order.totalInPaise / 100, createdAt: order.createdAt,
        items: order.items.map(({ productId, quantity }) => ({ productId, quantity })),
      }));
      const payment = result.payment as PaymentParams | undefined;
      if (method === "razorpay" && payment) {
        // The order and its stock are already reserved. If the shopper closes the window or a payment fails, the order page lets them pay again.
        setPaymentNote("Complete your payment in the secure window…");
        await payWithRazorpay({
          orderNumber: order.orderNumber,
          params: payment,
          prefill: { name: order.customer.name, email: order.customer.email, contact: order.customer.phone },
          onFailedAttempt: (message) => setPaymentNote(`Payment failed: ${message}`),
        });
      }
      router.push(`/orders/${order.orderNumber}`);
    } catch {
      setInventoryError("Could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (!cart.length) return <><SiteHeader/><main className="empty-state"><h1 className="serif">Your bag is empty.</h1><Link href="/shop" className="button dark">Continue shopping</Link></main></>;

  return <><SiteHeader/><main className="section checkout-layout"><div><span className="eyebrow">Almost yours</span><h1 className="serif">Delivery details</h1><form className="checkout-form" onSubmit={submit} noValidate>
    <div className="form-grid"><Field name="name" label="Full name" error={errors.name}/><Field name="phone" label="Mobile number" inputMode="numeric" error={errors.phone}/><Field name="email" label="Email address" type="email" error={errors.email}/><Field name="pincode" label="PIN code" inputMode="numeric" error={errors.pincode}/><Field name="address" label="Street address" className="span-two" error={errors.address}/><Field name="city" label="City" error={errors.city}/><Field name="state" label="State" error={errors.state}/></div>
    <div className="payment-choice"><span className="eyebrow">Payment method</span><label><input type="radio" name="payment" checked={method === "razorpay"} onChange={() => setMethod("razorpay")}/> Pay online <small>UPI, cards, net banking and wallets via Razorpay</small></label><label><input type="radio" name="payment" checked={method === "cod"} onChange={() => setMethod("cod")}/> Cash on delivery <small>Pay when your order arrives</small></label></div>
    {inventoryError && <p className="form-error" role="alert">{inventoryError}</p>}{paymentNote && <p role="status">{paymentNote}</p>}<button className="button dark" disabled={submitting} type="submit">{submitting ? (method === "razorpay" ? "Opening payment…" : "Placing order…") : method === "razorpay" ? `Pay ${formatPrice(total)}` : `Place order · ${formatPrice(total)}`}</button>
  </form></div><aside className="order-summary"><h2 className="serif">Your order</h2>{cart.map((line) => { const p = products.find((item) => item.id === line.productId); return p ? <div className="summary-line" key={p.id}><span>{p.name} × {line.quantity}</span><span>{formatPrice(p.price * line.quantity)}</span></div> : null; })}<div className="summary-line"><span>Shipping</span><span>{shipping ? formatPrice(shipping) : "Free"}</span></div>{safeDiscount > 0 && <div className="summary-line"><span>Discount</span><span>−{formatPrice(safeDiscount)}</span></div>}<div className="summary-total"><strong>Total</strong><strong>{formatPrice(total)}</strong></div><p className="summary-note">By placing your order, you agree to our shipping and return policy.</p></aside></main></>;
}

function Field({ name, label, error, type = "text", inputMode, className = "" }: { name: CheckoutField; label: string; error?: string; type?: string; inputMode?: "numeric"; className?: string }) {
  return <label className={`form-field ${className}`}><span>{label}</span><input name={name} type={type} inputMode={inputMode} autoComplete={name === "name" ? "name" : name === "phone" ? "tel" : name === "email" ? "email" : name === "address" ? "street-address" : "off"}/>{error && <small className="form-error">{error}</small>}</label>;
}
