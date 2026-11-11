# Simple & Unique

Next.js storefront for a direct-to-consumer jewellery and accessories shop.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and configure `DATABASE_URL` when a PostgreSQL database is available.
3. Run `npm run dev`.

## Current functionality

- Search and filter the catalog by category, material, price, availability, and sort order.
- Product detail pages with price/MRP, stock status, material and care information.
- Browser-persisted guest cart and wishlist, quantity updates, and the `UNIQUE10` coupon for orders above ₹999.
- Guest checkout with Indian phone/PIN validation and a cash-on-delivery order confirmation.
- Browser-local order history and an admin demo for inventory edits and order status changes.
- A versioned products API backed by PostgreSQL; query parameters include `category`, `material`, `q`, `maxPrice`, `inStock`, `sort`, and `limit`.

Cart, wishlist, guest orders, and admin changes are stored in the current browser. They do not sync between devices and do not reserve inventory on a server. Customer/admin authentication, email/SMS notifications, online payment processing, and order writes require further implementation and provider credentials.

## Project layout

- `app/` — App Router pages and `/api/v1` route handlers.
- `features/` — Catalog, cart, checkout, storefront, and admin feature modules.
- `store/` — Redux store and provider.
- `server/` — Server-only services, repositories, and database client.
- `prisma/` — PostgreSQL data model.

Route handlers stay thin: validation belongs at the request boundary, business logic in services, and data access behind repositories. Keep server credentials and database access in `server/`; only client-safe state and UI belong in browser bundles.

## API

- `GET /api/v1/health`
- `GET /api/v1/products?category=necklaces&material=18K%20Gold%20Plated&sort=price-low&limit=24`

Product prices are represented in paise in the API/database. `maxPrice` is accepted in rupees and converted to paise for the database query. Before production use, add authenticated customer/admin endpoints, server-side order creation and inventory transactions, Razorpay order/signature verification and webhooks, and email/SMS delivery.

## Database setup

After creating `.env` with a PostgreSQL `DATABASE_URL`, initialize the schema and add the starter catalog:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

With Prisma 6, the configured seed runs after `migrate dev`. Run `npm run db:seed` to seed again later. It uses create-only upserts, so reruns do not reset existing prices, stock, or product edits.
