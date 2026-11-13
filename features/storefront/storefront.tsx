"use client";

import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/features/catalog/product-card";
import { productImageUrl } from "@/features/catalog/products";
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
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Made for your every day</span>
            <h1 className="serif">
              A little shine.
              <br />A lot of you.
            </h1>
            <p>
              Thoughtful pieces with a lasting glow. Meet the jewellery you’ll
              reach for every morning.
            </p>
            <Link className="button" href="/shop">
              Find your everyday
            </Link>
          </div>
        </section>
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
        <section className="newsletter">
          <span className="eyebrow">A note from us</span>
          <h2 className="serif">Good things, occasionally.</h2>
          <p>New pieces, little stories, and a treat for your first order.</p>
          <form className="newsletter-form" action="/shop">
            <input
              type="email"
              aria-label="Email address"
              placeholder="Your email address"
            />
            <button type="submit">Explore ↗</button>
          </form>
        </section>
      </main>
      <footer className="footer">
        <div>
          <strong className="brand">SIMPLE & UNIQUE</strong>
          <p>Everyday, elevated.</p>
        </div>
        <div>
          <Link href="/shop">Shop jewellery</Link>
          <p>
            <Link href="/admin">Admin dashboard</Link> ·{" "}
            <Link href="/account/orders">Track an order</Link>
          </p>
        </div>
        <div>© 2026 Simple & Unique</div>
      </footer>
    </>
  );
}
