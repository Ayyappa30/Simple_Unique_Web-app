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

// Edit these to change the home page offer and the feedback cards. Replace the sample feedback with real customer words.
const offer = {
  eyebrow: "Our little offer",
  title: "Free shipping on orders over ₹1,499",
  text: "Pick a few favourites and we will deliver them to your door, tracked all the way.",
  cta: "Shop the collection",
  href: "/shop",
};
const feedback = [
  { quote: "Wore it for weeks, in the shower too, and it still looks brand new.", name: "Sample customer", place: "Chennai" },
  { quote: "Beautifully packed and it arrived quickly. A perfect little gift.", name: "Sample customer", place: "Bengaluru" },
  { quote: "Light, simple and goes with everything. I keep coming back for more.", name: "Sample customer", place: "Hyderabad" },
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
        <section className="offer-banner" aria-label="Current offer">
          <span className="eyebrow">{offer.eyebrow}</span>
          <h2 className="serif">{offer.title}</h2>
          <p>{offer.text}</p>
          <Link className="button" href={offer.href}>{offer.cta}</Link>
        </section>
        <section className="section feedback" id="feedback">
          <div className="section-head">
            <div>
              <span className="eyebrow">Kind words</span>
              <h2 className="serif">What our customers say</h2>
            </div>
          </div>
          <div className="feedback-grid">
            {feedback.map((item, index) => (
              <figure className="feedback-card" key={index}>
                <div className="feedback-stars" aria-label="5 out of 5 stars">★★★★★</div>
                <blockquote>“{item.quote}”</blockquote>
                <figcaption><strong>{item.name}</strong> · {item.place}</figcaption>
              </figure>
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
