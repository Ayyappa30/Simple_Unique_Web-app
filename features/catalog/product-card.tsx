"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { addToCart, toggleWishlist } from "@/features/shop/shop-slice";
import { formatPrice, productImageUrl, type Product } from "@/features/catalog/products";
import { useShopDispatch, useShopSelector } from "@/store/provider";

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const dispatch = useShopDispatch();
  const saved = useShopSelector((state) => state.wishlist.includes(product.id));
  return <article className="product-card">
    <div className="product-image">
      <Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`}><Image src={productImageUrl(product.image)} alt={product.name} fill sizes="(max-width: 800px) 50vw, 25vw" loading={eager ? "eager" : "lazy"}/></Link>
      <span className="tag">{product.tag}</span>
      <button className={`wishlist-toggle${saved ? " is-saved" : ""}`} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} onClick={() => dispatch(toggleWishlist(product.id))}><Heart size={17} fill={saved ? "currentColor" : "none"}/></button>
      <button className="quick-add" disabled={product.stock <= 0} onClick={() => dispatch(addToCart(product.id))}>{product.stock > 0 ? "Add to bag +" : "Sold out"}</button>
    </div>
    <div className="product-info"><div><Link href={`/products/${product.slug}`} className="product-name">{product.name}</Link><p className="product-material">{product.material}</p></div><span className="product-price">{formatPrice(product.price)}</span></div>
  </article>;
}
