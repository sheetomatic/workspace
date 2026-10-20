# Template storefront hardening — code only

## Scope and source

Active checkout: `/workspace/pricing-clarity`, branch `codex/template-store-checkout`.
Baseline: `031c376`, not the older main snapshot. The live catalogue and existing Courses payment code were inspected. Production contains build-time patches absent from main, so this checkout must not be deployed wholesale.

The later instruction explicitly prohibits deployment/publication and real payments. A staging build started under the earlier request was cancelled (`dpl_AVY4i1rsd3g27MoYNcDvGH7hxjG6`) before its migration step; production remained `dpl_9agEkCTH1dEXa52m1yuGVeN5UAvf`. No production migration, payment or customer message was performed. The abandoned manual-payment implementation and its deployment automation were removed; they remain recoverable in Git history. The final revision is committed locally only.

## Courses findings and reuse

Courses uses a Razorpay.me keyless hosted checkout, a browser callback and manual confirmation. That is not cryptographic provider verification and is **not** used to mark template carts paid. Reused: the Checkout SDK loader, merchant presentation conventions and exact INR handling. The shared amount helper now preserves paise (₹998 + GST = ₹1,177.64) without changing whole-rupee course prices. Script-load failures can be retried.

## Payment guarantees

- Server reads active products and deliverable copy links, applies the existing ₹998 maximum template-price rule, validates buyer address/GSTIN/terms, calculates GST and persists an immutable seller/buyer/item/tax snapshot.
- Razorpay order creation is server-side using the saved total in integer paise. The browser cannot override the amount. A timeout retains a recoverable `creating` order; retries do not blindly create another provider order.
- Browser signatures and raw-body webhook signatures are verified. Payment details are fetched server-side and must match the order, INR amount, captured state and no refunds. Unsigned callbacks and user-submitted receipt references cannot unlock a cart.
- Status checks reconcile with the provider. Pending/authorized payments block retry; failed payments can retry against the same order. Closing the payment modal does not imply failure or payment.
- Atomic row claiming and invoice-counter allocation make callback/webhook replay idempotent. Unique payment references cannot fund two cart orders.
- Copy links and invoices are unavailable before verified payment. Fulfilment uses a database lease and a stable Resend idempotency key. Uncertain delivery attempts older than 23 hours require operator reconciliation rather than risking an automatic duplicate beyond Resend's 24-hour deduplication window. Verified downloads remain available if email fails.
- GST invoices contain the seller profile, buyer name/address/GSTIN, place of supply, item values, SAC, CGST/SGST or IGST, total and payment reference. HTML invoices can be printed/saved as PDF. Existing 18% GST and SAC 997331 configuration should be confirmed by the business's tax adviser before activation.

## Catalogue artwork

13 product-specific, colour-coded cover illustrations replace tiny screenshots. Consistent card layout/aspect, legible headings, workflow labels, strong contrast and accessible image descriptions distinguish CRM, FMS, inventory, attendance, expenses, tasks, dispatch and other products. Covers are labelled illustrations, not screenshots or customer metrics. Cloud subscriptions remain separate; no subscription pricing changed.

## Activation prerequisites — not performed

1. Verify the intended Razorpay merchant/test account and securely configure `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`.
2. Review/apply only the additive `20261020060000_template_checkout` and `20261020150000_template_payment_safety` migrations against the verified target. Do not run unrelated pending migrations.
3. Configure the webhook and complete provider test-mode end-to-end checks. Use no real customer/payment data.
4. Confirm the seller GST profile and email configuration, then explicitly set `TEMPLATE_CHECKOUT_ENABLED=true` only after release approval.

Without those credentials/flag, checkout stays gated; the catalogue/cart remain usable. No secrets are in client bundles or source control.

## Local verification

40 focused tests passed, covering prices/GST, missing delivery links/terms, immutable invoices, access control, forged callbacks, provider mismatch, pending/failed reconciliation, repeated webhook/callbacks, concurrent email fulfilment and safe email retries. Integration tests refuse non-local databases and mock all gateway/email calls. Browser tests passed at 320, 390, 768 and 1440 pixels, covering cart persistence, GST, cancellation, pending-state reload, same-order retry and verified-only downloads. Both additive migrations were executed successfully on a fresh isolated local database. Scoped TypeScript and changed-file ESLint passed. Full repository TypeScript still has seven known errors in unrelated billing/Fleet/sheet-sync/activation tests; these are not silently ignored or fixed in this task. Provider test-mode end-to-end payment remains unrun because credentials are not configured; mocked checks are not represented as real payments.

## Exact final file delta from `031c376`

- `docs/template-checkout-hardening.md`
- `prisma/schema.prisma`
- `prisma/migrations/20261020150000_template_payment_safety/migration.sql`
- `scripts/check-template-cart.mjs`
- `src/app/api/templates/checkout/[id]/route.ts`
- `src/components/marketing/template-artwork.tsx`
- `src/components/marketing/template-cart.css`
- `src/components/marketing/templates-store-content.tsx`
- `src/components/marketing/razorpay-checkout-loader.ts`
- `src/components/marketing/razorpay-pay-frame.tsx`
- `src/lib/integrations/email.ts`
- `src/lib/payments/razorpay-me.ts`
- `src/lib/payments/razorpay-me.test.ts`
- `src/lib/templates/checkout.ts`
- `src/lib/templates/checkout.integration.test.ts`
- `src/lib/templates/email-delivery.test.ts`

Existing baseline files already implement server-side order creation, signature verification, webhook processing, GST calculations and invoice rendering; these were retained and tested rather than replaced with the unverified Courses flow.
