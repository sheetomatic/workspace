# Template cart and GST checkout — 20 October 2026

## Scope

One-time Sheets/AppSheet/Excel templates only. Catalogue prices are capped at ₹998 before GST; existing ₹499 prices remain. Hosted Cloud Software subscriptions and Workspace plans are unchanged. Standard copies exclude customisation, setup services and third-party platform subscriptions. Products without a delivery link cannot be purchased.

The public catalogue is read-only: it no longer calls the seed routine on page visits. Existing product prices are retained in the database to avoid retroactively repricing legacy orders; the capped policy is applied to new catalogue displays and new server-created checkout snapshots. Legacy order confirmation/proof workflows remain intact; only creation of new legacy single-product orders is retired.

## Payment activation gate

The existing Vercel production project is `sheetomatic-redesign` (`prj_E2G99Y1UGVVQ7SXqmJQfVKjzy2yt`), team `sheetomatic`. No Razorpay API keys were configured when inspected. The existing Razorpay.me handle is not a replacement for server-side payment verification.

The new checkout remains unavailable unless `TEMPLATE_CHECKOUT_ENABLED=true` and all three server-only variables exist:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Configure these securely in Vercel, never in source or chat. They must belong to the verified Sheetomatic merchant. Enable automatic capture in the merchant's approved payment settings. Configure `https://sheetomatic.com/api/templates/webhook` for `payment.captured` and `order.paid`, with the matching webhook secret. Validate using Razorpay test mode before enabling live payments. Do not enable payment collection merely because keys exist.

Before activation, apply only the reviewed additive migration `prisma/migrations/20261020060000_template_checkout/migration.sql` to the verified Sheetomatic production database and record it in the migration history using the normal release process. Do not run every pending migration from this old checkout. This migration creates two new tables and indexes and does not alter customer data. Confirm the seller's saved GST profile and the 18% software-licence tax classification (SAC 997331) with the business's tax adviser before collection. Resolve any differing classification in the catalogue policy before issuing real invoices.

## Trust boundaries

- Client sends product IDs and billing details, never authoritative prices. Server validates availability and delivery links, prices in integer paise, GSTIN/state agreement and complete Indian billing address.
- Immutable order snapshot includes seller, buyer, products, price, tax and delivery links. Updates to the product catalogue cannot rewrite issued invoices.
- Each checkout uses a 256-bit browser-generated access capability, hashed in the database, sent only in the Authorization header. No secrets or customer details in URLs. Access persists in sessionStorage for the current tab; the cart alone persists in localStorage. Buyer receives invoice and links by email after verified payment.
- Browser success signatures are verified with the API secret, webhook signatures with the webhook secret. Payment is fetched independently from Razorpay; order, amount, INR currency and captured/unrefunded status must all match.
- Invoice allocation is transactional and idempotent under concurrent callbacks. Dedicated annual ST series: `ST2627/00000001`. Not a promise of statutory e-invoice/IRN integration.
- Invoice HTML escapes all customer text, is served privately without caching, and is downloadable/printable as PDF using the browser. Unpaid or unauthorised requests cannot access invoices or copy links.
- Gateway-order timeout leaves a support-recoverable record. It does not blindly create additional gateway orders on retry. Webhook failures return a retryable response. Duplicate delivery emails are possible under concurrent delivery/retry; invoices and payment records are not duplicated.
- Refunds/credit notes and a new administrative order-management screen are not part of this change. Refund handling must use the merchant/accounting process.

## Local validation

Use the existing checkout, not a new worktree. Dependencies are unchanged. A disposable local PostgreSQL 16 container on `127.0.0.1:55439` was used, not a customer database. `checkout.integration.test.ts` refuses to run mutations unless `DATABASE_URL` is exactly the dedicated test database URL. Gateway and email calls are mocked; no real payments or customer messages are made by tests.

Commands:

```sh
npm run db:generate
npm run test:unit -- src/lib/templates/commerce.test.ts
DATABASE_URL=postgresql://postgres@127.0.0.1:55439/template_checkout_test DIRECT_URL=postgresql://postgres@127.0.0.1:55439/template_checkout_test npm run test:unit -- src/lib/templates/checkout.integration.test.ts
node scripts/check-template-cart.mjs
```

Browser checks require a local dev server on port 3140, isolated test fixtures and explicitly fake test gateway configuration. They intercept gateway calls; the script refuses remote targets. The real gateway happy path remains unverified until test-mode credentials and the webhook are configured.

The full local type check has seven pre-existing errors in unchanged billing, Fleet, sheet-sync and activation-bundle tests. Changed-file lint and focused tests are checked separately; the staged production build must also pass TypeScript.

## Deployment constraint

Production includes changes missing from main. Preserve its current preparation chain and recent pricing release; never deploy this entire old checkout directly. Publish with checkout disabled until the activation steps above pass. No production schema migration or credential change is performed by the storefront build.
