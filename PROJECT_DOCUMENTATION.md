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
- Checkout at `/checkout` validates Indian mobile numbers and PIN codes and supports cash on delivery and online payment (Razorpay).
- Successful guest orders receive a local order reference and confirmation page at `/orders/[id]`.
- Wishlist at `/wishlist` and order history at `/account/orders`.
- Cart, wishlist, and the order numbers of guest orders persist in the current browser under `simple-unique-shop-v1`; the orders themselves are stored in the database.

### Admin demo

`/admin` contains browser-local product create, edit, and remove actions, inventory counts, order summaries, and order status updates. It is not protected by admin authentication and must not be used for live store operations.

### Authentication

Email + password accounts with a `Role` (`CUSTOMER` or `ADMIN`) on `User`. Passwords are hashed with scrypt; sessions are HMAC-signed, httpOnly cookies (`su_session`, 12h) signed with `SESSION_SECRET`.

- Pages: `/login` (customers and admins; `/login?next=/admin` shows the admin variant) and `/register` (customers only).
- API: `POST /api/v1/auth/login`, `/register`, `/logout`, `GET /api/v1/auth/me`. Login and register are rate limited (in-memory, per instance).
- `proxy.ts` redirects `/admin/*` to `/login` unless the cookie carries the `ADMIN` role. Admin data is still browser-local, so server-side admin APIs must re-check the role (`getCurrentUser()` in `server/auth/current-user.ts`) when they are added.
- The admin account is created by `npm run db:seed` from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (create-only; never overwrites an existing user). Required env: `SESSION_SECRET` (32+ chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

### Admin product management

All admin endpoints require an `ADMIN` session (401 if signed out, 403 for customers). Prices are integer paise.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/admin/products` | All non-archived products, including hidden ones |
| `POST /api/v1/admin/products` | Create (`name`, `category`, `priceInPaise`, `mrpInPaise`, `stock`, `material`, `image`, optional `description`, `isActive`). SKU and slug are generated |
| `PATCH /api/v1/admin/products/[id]` | Partial update. Fields you omit are left unchanged; the slug stays stable on rename |
| `DELETE /api/v1/admin/products/[id]` | Soft delete (sets `archivedAt`, hides the product). Order history keeps its link to the product |

`image` accepts an uploaded Cloudinary URL, an `images.unsplash.com` URL, or an Unsplash photo ID. The `/admin` page uses these endpoints, and the storefront loads its catalog from `GET /api/v1/products` on page load (falling back to the built-in catalog if the API is down). Carts and wishlists are still browser-local.

### Orders

Checkout saves orders to PostgreSQL (cash on delivery). The server recalculates prices, the `UNIQUE10` coupon and shipping from the database and reduces stock atomically, so prices sent by the browser are ignored and the last item can't be sold twice.

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `POST /api/v1/orders` | Guests and signed-in users | Place an order (`customer`, `address`, `items`, optional `coupon`, `paymentMethod` of `cod` or `razorpay`). Linked to the account when signed in. Rate limited |
| `GET /api/v1/orders/[orderNumber]` | Anyone with the order number | Order details. Order numbers look like `SU-2026-ABCDE12345` (about 50 bits of randomness), so they work like private links for guests |
| `GET /api/v1/orders?numbers=a,b` | Guests and signed-in users | Orders this device remembers, plus the signed-in user's own orders |
| `GET /api/v1/admin/orders` | Admin | Latest 200 orders, optional `?status=` filter |
| `PATCH /api/v1/admin/orders/[id]` | Admin | Update `status`, `trackingNumber`, `carrier` |

Status rules: cancelling puts the items back into stock; delivering marks cash on delivery as paid; `CANCELLED` and `DELIVERED` orders can't be changed. The delivery address is stored on the order (`shipStreet`, `shipCity`, `shipState`, `shipPincode`).

### Online payments (Razorpay Standard Checkout)

Checkout offers **Pay online** (UPI, cards, net banking, wallets) and **Cash on delivery**. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env` (use `rzp_test_` keys until you go live). The secret never leaves the server; the browser only receives the public key id from the order response.

Flow:

1. `POST /api/v1/orders` with `"paymentMethod": "razorpay"` saves the order (stock reserved, payment `PENDING`), then creates the Razorpay order for the server-calculated total (receipt = order number) and returns `payment: { razorpayOrderId, amount, currency, keyId }`.
2. The browser opens Razorpay's payment window (`features/checkout/razorpay.ts`).
3. On success the browser sends `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` and the order number to `POST /api/v1/payments/razorpay/verify`. The server checks `HMAC-SHA256(order_id|payment_id, key_secret)` in constant time and only then marks the order `PAID` (idempotent, so the confirmation email is sent once). A bad or missing signature returns 400 and never marks the order paid.
4. If the shopper closes the window or a payment fails, the order page shows **Pay now**, backed by `POST /api/v1/orders/[orderNumber]/pay`.

Safety rules:

- Unpaid online orders hold their stock for 60 minutes, then are cancelled and restocked. Before cancelling, the server asks Razorpay whether a payment was captured (covers shoppers who paid and closed the tab). The same check runs when the order page is opened.
- Admins can't move an unpaid online order past Pending (only cancel it). Cancelling an order that was paid online reminds the admin to refund it in the Razorpay dashboard; refunds are not automated yet.
- If a payment arrives for an order that already expired (via the browser or a webhook), the server logs `[razorpay] Payment … received for CANCELLED order …` and the payment must be refunded manually.
- Razorpay failures when starting a payment cancel the order and release its stock. The Razorpay account should have **auto-capture** on (the default for new accounts) because only `captured` payments are treated as paid.
- Not built yet: automatic refunds (refund from the Razorpay dashboard; the webhook then marks a fully refunded order as refunded).

### Razorpay webhooks

`POST /api/v1/payments/razorpay/webhook` lets Razorpay tell the server about payments directly, so an order is marked paid even if the shopper closes the tab right after paying. It verifies the `x-razorpay-signature` header (HMAC-SHA256 of the raw body with `RAZORPAY_WEBHOOK_SECRET`, a different secret from the API key secret) and returns 400 for a bad or missing signature, 200 for handled or intentionally ignored events, and 5xx on server errors so Razorpay retries.

| Event | What the server does |
| --- | --- |
| `payment.captured`, `order.paid` | Marks the order paid (idempotent, so the confirmation email is sent once). Ignored if the amount differs from what we charged or the order isn't ours. A payment for an already-cancelled order is recorded and logged as needing a manual refund |
| `payment.failed` | Logged only; the shopper can retry from the order page |
| `refund.processed` | A full refund sets the payment to `REFUNDED`; partial refunds are left alone |

Setup (once the site has a public URL; Razorpay can't reach `localhost`):

1. Razorpay Dashboard (Test Mode for testing) > Account & Settings > Webhooks > Add New Webhook.
2. URL: `https://your-domain/api/v1/payments/razorpay/webhook`.
3. Secret: the value of `RAZORPAY_WEBHOOK_SECRET` from `.env` (you choose it; use a long random string).
4. Active events: `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`.
5. To try it locally, expose your dev server with a tunnel such as `ngrok http 3000` or `cloudflared tunnel --url http://localhost:3000` and use that URL.

The browser verify call, the webhook, and the "check Razorpay when the order is opened" fallback can arrive in any order; whichever comes first marks the order paid and the others do nothing.

Test mode: use Razorpay's test cards (for example `4111 1111 1111 1111`, any future expiry, any CVV) and complete the test OTP or success screen. No real money moves.

### Order emails and tracking

Customers get an email when their order is placed, shipped, delivered or cancelled, and again when a tracking number is added or changed on a shipped order. Emails are sent through [Resend](https://resend.com) (free tier) with a plain `fetch` call (`server/email/`), after the response is sent, so a failed email never fails an order. Customer-supplied text is HTML-escaped in the templates.

Set these in `.env` to turn sending on; without them the server only logs `[email] Not configured…` lines:

| Variable | Meaning |
| --- | --- |
| `RESEND_API_KEY` | API key from the Resend dashboard |
| `EMAIL_FROM` | Sender, such as `Simple & Unique <orders@yourdomain.com>`. Resend only delivers to arbitrary customers from a domain you have verified (its `onboarding@resend.dev` test sender only reaches your own address) |
| `SITE_URL` | Public store address used in the "View your order" link |

Admins set the carrier and tracking number from the Orders table on `/admin`. Clearing both fields removes them.

### Image uploads (Cloudinary)

`POST /api/v1/admin/upload` (admin only, multipart `file`, JPG/PNG/WebP up to 5 MB) uploads to Cloudinary with a signed request and returns `{ data: { url } }`. The admin product form has an upload button that fills the image field. `productImageUrl()` serves Cloudinary URLs resized with `c_limit,w_<width>,q_auto,f_auto`. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in `.env` (the secret stays server-side).

### Account prompt

The person icon in the header opens an accessible prompt with “Login now to avail best offers!” and a continue-as-guest link. It now links to sign in / create account, and shows a sign-out / dashboard menu once signed in.

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

`prisma/schema.prisma` defines PostgreSQL models for products, categories, images, variants, users, addresses, orders, order items, and reviews. The catalog API reads products, categories, images, and order-item counts through Prisma. Products, orders and users use the database; the cart and wishlist stay in the browser.

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

Razorpay checkout is integrated (see "Online payments"). Do not add real secrets to source control; `.env` is git-ignored.

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
- Add automatic refunds, then switch from `rzp_test_` to live keys after Razorpay approves the account.
- Add SMS order notifications, saved customer addresses, shipping integrations, and verified reviews.
- Add production rate limiting, monitoring, backups, and deployment configuration.

