"use client";

import { useMemo, useState } from "react";
import { SiteHeader } from "@/features/storefront/site-header";
import { ProductCard } from "@/features/catalog/product-card";
import { useShopSelector } from "@/store/provider";

export function ShopPage({ initialCategory }: { initialCategory?: string | string[] }) {
  const products = useShopSelector((state) => state.products);
  const [category, setCategory] = useState(typeof initialCategory === "string" ? initialCategory : "all");
  const [material, setMaterial] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("popular");
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState("5000");
  const filtered = useMemo(() => {
    const items = products.filter((product) =>
      (category === "all" || product.category === category) &&
      (material === "all" || product.material === material) &&
      (availability === "all" || (availability === "in-stock" ? product.stock > 0 : product.stock <= 0)) &&
      product.price <= Number(maxPrice) &&
      `${product.name} ${product.category} ${product.material}`.toLowerCase().includes(search.toLowerCase().trim()),
    );
    if (sort === "price-low") items.sort((a, b) => a.price - b.price);
    if (sort === "price-high") items.sort((a, b) => b.price - a.price);
    if (sort === "newest") items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  }, [products, category, material, availability, sort, search, maxPrice]);
  return <><SiteHeader/><main className="section shop-page">
    <div className="section-head"><div><span className="eyebrow">Made for the everyday</span><h1 className="serif">Shop all pieces</h1></div><span className="eyebrow">{filtered.length} pieces</span></div>
    <div className="shop-toolbar"><label className="search-field">Search <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try hoops or gold plated"/></label>
      <label>Category <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option><option value="necklaces">Necklaces</option><option value="piercings">Body piercings</option><option value="bracelets">Bracelets</option><option value="earrings">Earrings</option><option value="sets">Sets</option></select></label>
      <label>Material <select value={material} onChange={(event) => setMaterial(event.target.value)}><option value="all">All materials</option><option>18K Gold Plated</option><option>Stainless Steel Anti-Tarnish</option></select></label>
      <label>Availability <select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">All</option><option value="in-stock">In stock</option><option value="sold-out">Sold out</option></select></label>
      <label>Up to ₹{maxPrice}<input type="range" min="500" max="5000" step="100" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}/></label>
      <label>Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="popular">Popular</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="newest">Newest</option></select></label>
    </div>
    {filtered.length ? <div className="products-grid">{filtered.map((product, index) => <ProductCard key={product.id} product={product} eager={index === 0}/>)}</div> : <div className="empty-state"><h2 className="serif">Nothing in this edit just yet.</h2><p>Try changing a filter to find your next favourite.</p><button className="button dark" onClick={() => { setCategory("all"); setMaterial("all"); setAvailability("all"); setSearch(""); setMaxPrice("5000"); }}>Clear filters</button></div>}
  </main></>;
}
