"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { removeFromCart, setQuantity } from "@/features/shop/shop-slice";
import { formatPrice, productImageUrl } from "@/features/catalog/products";
import { SiteHeader } from "@/features/storefront/site-header";
import { useShopDispatch, useShopSelector } from "@/store/provider";

export function CartPage() {
  const dispatch = useShopDispatch();
  const { cart, products } = useShopSelector((state) => state);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");
  const items = useMemo(() => cart.flatMap((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return product ? [{ ...item, product }] : [];
  }), [cart, products]);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = couponApplied ? Math.min(Math.round(subtotal * .1), 500) : 0;
  const shipping = subtotal - discount >= 1499 || subtotal === 0 ? 0 : 99;
  const total = subtotal - discount + shipping;
  return <><SiteHeader/><main className="section checkout-layout"><div><span className="eyebrow">Your edit</span><h1 className="serif">Your bag <small>({items.reduce((sum, item) => sum + item.quantity, 0)})</small></h1>
    {items.length ? <div className="cart-list">{items.map(({ product, quantity }) => <article className="cart-item" key={product.id}><Link className="cart-thumb" href={`/products/${product.slug}`}><Image src={productImageUrl(product.image, 400)} alt={product.name} fill sizes="110px"/></Link><div className="cart-item-copy"><Link href={`/products/${product.slug}`}><strong>{product.name}</strong></Link><p>{product.material}</p><strong>{formatPrice(product.price)}</strong><div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => dispatch(setQuantity({ productId: product.id, quantity: quantity - 1 }))}><Minus size={13}/></button><span>{quantity}</span><button aria-label="Increase quantity" onClick={() => dispatch(setQuantity({ productId: product.id, quantity: quantity + 1 }))}><Plus size={13}/></button></div></div><button className="icon-button remove-item" aria-label={`Remove ${product.name}`} onClick={() => dispatch(removeFromCart(product.id))}><Trash2 size={17}/></button></article>)}</div> : <div className="empty-state"><h2 className="serif">Your bag is having a quiet moment.</h2><p>Find something that feels like you.</p><Link className="button dark" href="/shop">Explore the collection</Link></div>}
    </div>{items.length > 0 && <aside className="order-summary"><h2 className="serif">Order summary</h2><form className="coupon-row" onSubmit={(event) => { event.preventDefault(); if (coupon.trim().toUpperCase() === "UNIQUE10" && subtotal >= 999) { setCouponApplied(true); setCouponError(""); } else { setCouponApplied(false); setCouponError("Enter UNIQUE10 on orders over ₹999."); } }}><input aria-label="Coupon code" value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Promo code"/><button type="submit">Apply</button></form>{couponError && <p className="form-error">{couponError}</p>}{couponApplied && <p className="success-message">UNIQUE10 applied — 10% off.</p>}<div className="summary-line"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>{discount > 0 && <div className="summary-line"><span>Discount</span><span>−{formatPrice(discount)}</span></div>}<div className="summary-line"><span>Shipping</span><span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span></div><div className="summary-line"><span>Taxes</span><span>Included</span></div><div className="summary-total"><strong>Total</strong><strong>{formatPrice(total)}</strong></div><Link className="button dark full-width" href={couponApplied ? "/checkout?coupon=UNIQUE10" : "/checkout"}>Continue to checkout</Link><p className="summary-note">Secure checkout · Cash on delivery available</p></aside>}</main></>;
}
