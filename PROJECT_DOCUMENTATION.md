# Simple & Unique — Project Guide

## Overview

Simple & Unique is a mobile-friendly e-commerce storefront for fashion accessories and anti-tarnish jewellery. The app is built with Next.js App Router, React, TypeScript, Tailwind CSS, Redux Toolkit, Zod, and Prisma.

The current project is a functional storefront prototype. Its guest shopping flows work with browser storage and the storefront seed catalog. The versioned catalog API queries PostgreSQL after migrations and seeding. Customer/admin authentication, order persistence, online payments, and email/SMS delivery are not live yet.

## Features implemented

### Storefront and catalog

- Homepage with promotional hero, category links, featured products, and brand information.
- Product listing at `/shop` with search, category, material, price, availability, and sort filters.
- Product detail pages at `/products/[slug]` showing price, MRP, stock, material, care, wishlist, and add-to-cart controls.
- Product imagery served from Unsplash and optimized through `next/image`.

### Guest shopping

- Cart at `/cart` supports quantity changes, item removal, subtotal, shipping, taxes-included display, and coupon entry.
- Coupon `UNIQUE10` gives 10% off (maximum ₹500) on orders of ₹999 or more.
- Checkout at `/checkout` validates Indian mobile numbers and PIN codes and supports cash on delivery.
- Successful guest orders receive a local order reference and confirmation page at `/orders/[id]`.
- Wishlist at `/wishlist` and order history at `/account/orders`.
- Cart, wishlist, guest orders, and local catalog edits persist in the current browser under `simple-unique-shop-v1`.

### Admin demo

`/admin` contains browser-local product create, edit, and remove actions, inventory counts, order summaries, and order status updates. It is not protected by admin authentication and must not be used for live store operations.

### Account prompt

The person icon in the header opens an accessible prompt with “Login now to avail best offers!” and a continue-as-guest link. Actual sign-in and account creation are not implemented.

## Project structure

```text
app/                         Next.js routes, layouts, and API handlers
  account/orders/            Guest order history
  admin/                     Browser-local admin demo
  api/v1/                    Versioned API endpoints
  cart/                      Shopping cart route
  checkout/                  Guest checkout route
  orders/[id]/               Order confirmation route
  products/[slug]/           Product detail route
  shop/                      Search and filtered catalog route
  wishlist/                  Saved products route
features/
  catalog/                   Product seed data, cards, listing, and details
  checkout/                  Cart, checkout, and confirmation UI
  orders/                    Order history UI
  shop/                      Shop state and persisted-state validation
  storefront/                Homepage and shared header
prisma/schema.prisma         PostgreSQL data model
prisma/seed.ts               Idempotent catalog seed
prisma.config.ts             Prisma CLI and seed configuration
server/
  db/prisma.ts               Prisma Client singleton
  products/                  Prisma-backed product service and repository
store/
  provider.tsx               SSR-safe state provider and browser persistence
  store.ts                   Redux Toolkit store factory
```

## State and data flow

The storefront demo catalog is defined in `features/catalog/products.ts`. The `/api/v1/products` route validates query parameters with Zod, passes filters through the product service and Prisma repository, and returns prices in paise. It selects active, non-archived products and their category and primary image; popularity sorting uses order-item counts.

The UI renders from deterministic seed state so the page can be rendered immediately by Next.js. After hydration, the provider restores and validates browser-persisted state, then syncs state changes to browser storage. Redux Toolkit is loaded on the client after hydration to avoid calling Redux’s random initialization during prerendering.

## API endpoints

### `GET /api/v1/health`

Returns a small service health response.

### `GET /api/v1/products`

Supported query parameters:

| Parameter | Meaning |
| --- | --- |
| `category` | Category slug, such as `necklaces`, `earrings`, `bracelets`, `piercings`, or `sets` |
| `material` | Exact material label |
| `q` | Product name, category, or material search (up to 80 characters) |
| `maxPrice` | Maximum price in rupees, converted to paise for the query |
| `inStock` | `true` or `false` |
| `sort` | `popular`, `price-low`, `price-high`, or `newest` |
| `limit` | Number of products, from 1 to 48 (default 24) |

Example: `/api/v1/products?category=necklaces&sort=price-low&limit=12`

Product API and database prices use integer paise. The storefront formats prices as Indian rupees.

## Database model

`prisma/schema.prisma` defines PostgreSQL models for products, categories, images, variants, users, addresses, orders, order items, and reviews. The catalog API reads products, categories, images, and order-item counts through Prisma. The admin demo, cart, and guest orders are still local to the browser.

## Setup

Requirements: Node.js 20.19+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To prepare PostgreSQL, copy `.env.example` to `.env`, set `DATABASE_URL`, and run:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

With Prisma 6, the configured seed runs after `migrate dev`. Run `npm run db:seed` to seed again later. The seed uses stable unique slugs/SKUs and create-only upserts. It does not delete data or overwrite existing product stock, prices, or content when rerun. The catalog API returns `503` while the database is unavailable rather than silently returning seed data.

Razorpay environment variable names are listed in `.env.example`, but payment creation, signature verification, webhooks, and checkout integration still need implementation. Do not add real secrets to source control.

## Useful commands

```bash
npm run dev
npm run lint
npm run build -- --webpack
npm run start
```

## Production work still required

- Configure PostgreSQL and add trigram/full-text indexing if catalog search volume requires it.
- Implement customer sessions, registration/login, password hashing, OTP delivery, and authorization.
- Protect admin routes and implement server-side catalog and order endpoints.
- Create server-side orders with transactional stock checks and durable order items.
- Integrate Razorpay order creation, signature verification, webhook handling, and payment status updates.
- Add email/SMS order notifications, saved customer addresses, shipping integrations, and verified reviews.
- Add production rate limiting, monitoring, backups, and deployment configuration.

