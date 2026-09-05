# Marketplace API

A multi-vendor marketplace backend with escrow-style payments, built with Node.js, Express, Prisma, and PostgreSQL. Buyers can order from multiple vendors in a single checkout, payments are held in escrow until delivery is confirmed, and vendor payouts are processed automatically on a scheduled hold period.

**Live:** [marketplace-api-nine.vercel.app](https://marketplace-api-nine.vercel.app)
**DOCS:** [documenter.getpostman.com/view/56432757/2sBYAvwWP4](https://documenter.getpostman.com/view/56432757/2sBYAvwWP4)

## Overview

This is a backend-only REST API for a marketplace where independent vendors list products, buyers place orders that can span multiple vendors in one checkout, and vendors get paid out automatically once a delivery is confirmed and a hold period has passed. It was built to demonstrate backend and payment-systems depth beyond typical frontend/CRUD work.

## Core flow

1. **Buyer places an order** across one or more vendors in a single request. Stock is checked and decremented atomically, so a failure partway through an order rolls back everything, no partial orders or phantom stock deductions.
2. **Buyer pays via Paystack.** The API initializes a Paystack transaction and confirms payment through a signature-verified webhook, never through the client-side redirect alone.
3. **Each order item is tracked independently.** Since one order can include items from several vendors, each item has its own status (`SHIPPED`, `DELIVERED`, `CANCELLED`, etc.), and the overall order status is derived from the combined state of all its items (`PARTIALLY_SHIPPED`, `SHIPPED`, `CONFIRMED`, and so on).
4. **Vendor ships their item(s).** Only the vendor who owns an item can update its status, and only after payment has cleared.
5. **Buyer confirms delivery.** Once a vendor has fully delivered everything they owe on an order, a payout is created for that vendor.
6. **Payout enters a hold period** (24 hours by default) before it's eligible for release, this is what makes the payment "escrow," not just a checkout.
7. **A scheduled job processes eligible payouts automatically**, transferring funds to the vendor's registered bank account via Paystack's Transfer API once the hold period has passed. The platform fee is calculated and stored as a snapshot at payout time, so it stays accurate even if the fee percentage changes later.

## Tech stack

- **Runtime:** Node.js, Express
- **Database:** PostgreSQL (Neon), via Prisma ORM
- **Payments:** Paystack (checkout, webhooks, bank resolution, transfers)
- **Auth:** JWT (httpOnly cookies), bcrypt password hashing
- **Validation:** Zod
- **Deployment:** Vercel, with Vercel Cron for scheduled payout processing

## Features

- Multi-vendor orders with per-item status tracking
- Escrow-style payments: funds held until delivery is confirmed
- Automated, scheduled vendor payouts with a configurable hold period
- Platform fee tracking, snapshotted per payout for accurate historical reporting
- Paystack webhook integration with signature verification
- Bank account verification and automatic transfer recipient creation for vendors
- Role-based access (Buyer, Vendor, Admin) with ownership checks on every mutation
- Order cancellation at both the item and full-order level, blocked once shipping has started
- Admin tools: vendor verification, payout oversight, platform revenue reporting, dispute/refund status overrides
- Paginated, filterable listing endpoints throughout

## API overview

| Area | Base path | Notes |
|---|---|---|
| Auth | `/auth` | Register, login, logout |
| Vendor profiles | `/vendor-profile` | Create/update profile, bank verification, payouts, admin vendor list |
| Products | `/product` | CRUD, buyer-facing search and vendor-facing listing |
| Orders | `/orders` | Create order, list/view orders, ship/cancel items, admin overrides |
| Payments | `/order` | Initialize payment, confirm delivery |
| Reviews | `/review` | Create/update/delete reviews, list by product |
| Transactions | `/transactions` | Buyer and vendor transaction history |
| Admin | `/admin` | Payouts, platform revenue, vendor verification |
| Webhooks | `/api/webhooks/payment` | Paystack payment webhook (signature-verified) |
| Cron | `/api/cron` | Triggers scheduled payout processing |

## Getting started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (this project was built against [Neon](https://neon.tech))
- A [Paystack](https://paystack.com) account with test API keys

### Setup

```bash
git clone https://github.com/lucidwrld/marketplace-api.git
cd marketplace-api
npm install
```

Create a `.env` file in the project root:

```
DATABASE_URL=your_postgres_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
PAYSTACK_SECRET_KEY=your_paystack_secret_key
CRON_SECRET=your_cron_secret
NODE_ENV=development
```

Run migrations and start the server:

```bash
npx prisma migrate dev
npm run dev
```

### Testing payments locally

Paystack webhooks need a publicly reachable URL. Use a tunneling tool like [ngrok](https://ngrok.com) to expose your local server, and register the forwarded URL plus `/api/webhooks/payment` in your Paystack dashboard's webhook settings.

## Deployment notes

This project deploys to Vercel. Scheduled payout processing runs via Vercel Cron (`vercel.json`), which sends a `GET` request with an `Authorization: Bearer <CRON_SECRET>` header, not a custom header, this is Vercel's own convention and differs from most third-party cron services.

## License

MIT
