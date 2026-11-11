"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, Minus, Plus } from "lucide-react";
import { addToCart, toggleWishlist } from "@/features/shop/shop-slice";
import { formatPrice, productImageUrl } from "@/features/catalog/products";
import { SiteHeader } from "@/features/storefront/site-header";
import { useShopDispatch, useShopSelector } from "@/store/provider";

export function ProductDetails({ slug }: { slug: string }) {
  const dispatch = useShopDispatch();
  const product = useShopSelector((state) => state.products.find((item) => item.slug === slug));
  const saved = useShopSelector((state) => state.wishlist.includes(product?.id ?? ""));
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  if (!product) return <><SiteHeader/><main className="empty-state"><h1 className="serif">Piece not found</h1><Link className="button dark" href="/shop">Back to the shop</Link></main></>;
  return <><SiteHeader/><main className="pdp section"><div className="pdp-image"><Image src={productImageUrl(product.image, 1200)} alt={product.name} fill priority sizes="(max-width: 800px) 100vw, 55vw"/></div><div className="pdp-copy"><span className="eyebrow">{product.category} · {product.tag}</span><h1 className="serif">{product.name}</h1><p className="pdp-price">{formatPrice(product.price)} <del>{formatPrice(product.mrp)}</del> <span>{Math.round((1 - product.price / product.mrp) * 100)}% off</span></p><p className="stock-note">{product.stock > 0 ? `${product.stock} in stock · Ships across India` : "Currently sold out"}</p><p className="pdp-description">{product.description}</p><div className="detail-line"><span>Material</span><strong>{product.material}</strong></div><div className="detail-line"><span>Care</span><strong>Keep dry and store in the pouch provided</strong></div><div className="pdp-actions"><div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={15}/></button><span>{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))}><Plus size={15}/></button></div><button className="button dark" disabled={product.stock <= 0} onClick={() => { for (let i = 0; i < quantity; i += 1) dispatch(addToCart(product.id)); setAdded(true); }}>Add to bag</button><button className={`wishlist-large${saved ? " is-saved" : ""}`} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} onClick={() => dispatch(toggleWishlist(product.id))}><Heart fill={saved ? "currentColor" : "none"}/></button></div>{added && <p className="success-message" role="status">Added to your bag. <Link href="/cart">View bag</Link></p>}<div className="pdp-note"><strong>Made to stay, made to love.</strong><p>Every piece is checked by hand and packed with care. Free shipping on orders above ₹1,499.</p></div><div className="reviews"><h2 className="serif">Loved by the community</h2><p>Reviews from verified buyers will appear here after launch.</p></div></div></main></>;
}
