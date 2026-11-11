"use client";

import Link from "next/link";
import { ProductCard } from "@/features/catalog/product-card";
import { SiteHeader } from "@/features/storefront/site-header";
import { useShopSelector } from "@/store/provider";

export default function Page() {
  const { products, wishlist } = useShopSelector((state) => state);
  const saved = products.filter((product) => wishlist.includes(product.id));
  return <><SiteHeader/><main className="section"><div className="section-head"><div><span className="eyebrow">Saved for later</span><h1 className="serif">Your wishlist</h1></div></div>{saved.length ? <div className="products-grid">{saved.map((product) => <ProductCard product={product} key={product.id}/>)}</div> : <div className="empty-state"><h2 className="serif">Keep the pieces you love close.</h2><p>Tap the heart on any piece to save it here.</p><Link className="button dark" href="/shop">Explore the collection</Link></div>}</main></>;
}
