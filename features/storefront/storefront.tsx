"use client";

import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/features/catalog/product-card";
import { productImageUrl } from "@/features/catalog/products";
import { HeroCarousel } from "@/features/storefront/hero-carousel";
import { SiteHeader } from "@/features/storefront/site-header";
import { useShopSelector } from "@/store/provider";

const categories = [
  {
    name: "Necklaces",
    key: "necklaces",
    image: "photo-1599643478518-a784e5dc4c8f",
  },
  {
    name: "Earrings",
    key: "earrings",
    image: "photo-1535632066927-ab7c9ab60908",
  },
  {
    name: "Bracelets",
    key: "bracelets",
    image: "photo-1611591437281-460bfbe1220a",
  },
  {
    name: "Piercings",
    key: "piercings",
    image: "photo-1611652022419-a9419f74343d",
  },
];

export default function Storefront() {
  const products = useShopSelector((state) => state.products);
  return (
    <>
      <SiteHeader />
      <main id="top">
        <HeroCarousel />
        <section className="section" id="collections">
          <div className="section-head">
            <div>
              <span className="eyebrow">Find your favourite</span>
              <h2 className="serif">Shop by category</h2>
            </div>
            <p>Little details, made to feel like you.</p>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link
                className="category-card"
                href={`/shop?category=${category.key}`}
                key={category.key}
              >
                <Image
                  src={productImageUrl(category.image)}
                  alt={category.name}
                  fill
                  sizes="(max-width: 800px) 50vw, 25vw"
                />
                <span className="category-label">{category.name} ↗</span>
              </Link>
            ))}
          </div>
        </section>
        <section className="section" id="bestsellers">
          <div className="section-head">
            <div>
              <span className="eyebrow">The pieces you love</span>
              <h2 className="serif">A few good things</h2>
            </div>
            <Link className="eyebrow" href="/shop">
              View all pieces ↗
            </Link>
          </div>
          <div className="products-grid">
            {products
              .filter((product) => product.stock > 0)
              .slice(0, 4)
              .map((product, index) => (
                <ProductCard
                  product={product}
                  key={product.id}
                  eager={index === 0}
                />
              ))}
          </div>
        </section>
        <section className="benefits" id="about">
          <div>
            <strong>Made to stay</strong>
            <p>Thoughtful anti-tarnish finishes</p>
          </div>
          <div>
            <strong>A little more personal</strong>
            <p>Pieces for your own kind of everyday</p>
          </div>
          <div>
            <strong>Delivered with care</strong>
            <p>Shipping across India, always tracked</p>
          </div>
        </section>
      </main>
    </>
  );
}
