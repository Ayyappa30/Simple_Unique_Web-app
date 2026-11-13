"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/features/storefront/site-header";
import { ProductCard } from "@/features/catalog/product-card";
import { useShopSelector } from "@/store/provider";

const CATEGORY_OPTIONS = [
  ["all", "All"],
  ["necklaces", "Necklaces"],
  ["earrings", "Earrings"],
  ["bracelets", "Bracelets"],
  ["piercings", "Body piercings"],
  ["sets", "Sets"],
] as const;
const MAX_PRICE = "5000";

export function ShopPage({
  initialCategory,
}: {
  initialCategory?: string | string[];
}) {
  const products = useShopSelector((state) => state.products);
  const [category, setCategory] = useState(
    typeof initialCategory === "string" ? initialCategory : "all",
  );
  const [material, setMaterial] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("popular");
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const hasFilters =
    category !== "all" ||
    material !== "all" ||
    availability !== "all" ||
    search !== "" ||
    maxPrice !== MAX_PRICE;
  const clearFilters = () => {
    setCategory("all");
    setMaterial("all");
    setAvailability("all");
    setSearch("");
    setMaxPrice(MAX_PRICE);
  };
  const filtered = useMemo(() => {
    const items = products.filter(
      (product) =>
        (category === "all" || product.category === category) &&
        (material === "all" || product.material === material) &&
        (availability === "all" ||
          (availability === "in-stock"
            ? product.stock > 0
            : product.stock <= 0)) &&
        product.price <= Number(maxPrice) &&
        `${product.name} ${product.category} ${product.material}`
          .toLowerCase()
          .includes(search.toLowerCase().trim()),
    );
    if (sort === "price-low") items.sort((a, b) => a.price - b.price);
    if (sort === "price-high") items.sort((a, b) => b.price - a.price);
    if (sort === "newest")
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return items;
  }, [products, category, material, availability, sort, search, maxPrice]);
  return (
    <>
      <SiteHeader />
      <main className="section shop-page">
        <div className="section-head">
          <div>
            <span className="eyebrow">Made for the everyday</span>
            <h1 className="serif">Shop all pieces</h1>
          </div>
          <span className="eyebrow">{filtered.length} pieces</span>
        </div>
        <section className="shop-filters" aria-label="Filter products">
          <label className="search-box">
            <span className="visually-hidden">Search products</span>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search hoops, gold plated, necklaces…"
            />
          </label>
          <div className="chip-row" role="group" aria-label="Category">
            {CATEGORY_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`chip${category === value ? " active" : ""}`}
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="filter-row">
            <label className="filter-field">
              <span>Material</span>
              <select
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
              >
                <option value="all">All materials</option>
                <option>18K Gold Plated</option>
                <option>Stainless Steel Anti-Tarnish</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Availability</span>
              <select
                value={availability}
                onChange={(event) => setAvailability(event.target.value)}
              >
                <option value="all">All</option>
                <option value="in-stock">In stock</option>
                <option value="sold-out">Sold out</option>
              </select>
            </label>
            <label className="filter-field price-field">
              <span>
                Max price{" "}
                <strong>₹{Number(maxPrice).toLocaleString("en-IN")}</strong>
              </span>
              <input
                type="range"
                min="500"
                max="5000"
                step="100"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
              />
            </label>
            <label className="filter-field sort-field">
              <span>Sort by</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="popular">Popular</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
                <option value="newest">Newest</option>
              </select>
            </label>
            {hasFilters && (
              <button
                type="button"
                className="text-button clear-filters"
                onClick={clearFilters}
              >
                Clear all
              </button>
            )}
          </div>
        </section>
        {filtered.length ? (
          <div className="products-grid">
            {filtered.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                eager={index === 0}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2 className="serif">Nothing in this edit just yet.</h2>
            <p>Try changing a filter to find your next favourite.</p>
            <button className="button dark" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
      </main>
    </>
  );
}
