# Tasks payment verification — 25 October 2026

## Completed evidence

- Both production domains were read from Vercel and still target `dpl_9a88nq7gBnWHsm8hn4rbmVhwtc8m`. No alias assignment or production-source replacement was performed.
- Correct project: `sheetomatic-redesign` / `prj_E2G99Y1UGVVQ7SXqmJQfVKjzy2yt`.
- Production environment names for the Razorpay Key ID, Key Secret, webhook secret and checkout flag are present. Values were not downloaded or printed.
- A non-promotable, read-only verification job `dpl_HqM7FqENo4WHydJyRazR6RHtfMMv` ran the pinned preflight script from `8be80c65b8c1c61fbaf7477cd3074264702ba587` using that project's existing environment. Logs confirm live Key ID format, required configuration, checkout disabled, and successful authenticated `GET /v1/orders?count=1`. No response body or customer information was logged. No order/payment was created.
- That job intentionally exits 78 after the checks. Its ERROR state is expected: it is not a deployable application or rollback target. Neither domain was assigned to it. Do not promote it.
- Fixed the local concurrent-callback case where another payment wins the paid-order update: the losing different payment is now rejected rather than acknowledged as the invoice's payment.
- 45 focused payment/GST/webhook tests passed. Full non-integration suite: 601 tests across 124 files passed. `tsc --noEmit`, targeted ESLint and diff whitespace checks passed.
- Prepared the public setup guide at `/guides/tasks-setup` in source. Not deployed or visually browser-verified in this turn.

## Not yet a launch approval

Live provider authentication is not proof of payment capture, settlement, webhook delivery, GST accuracy, account activation or invoice delivery. The following are still outstanding:

1. Implement transactional, order-linked Tasks-only activation. Existing `provisionClientWorkspace` is not a safe direct fulfillment handler: it is not an order-idempotent transaction and can send welcome messages. Never grant the broad client50 preset. Never use the checkout's seller organization ID as the buyer workspace.
2. Securely establish buyer access through existing authentication/email verification. A checkout bearer token is not permission to take over an existing account. New purchases and renewal of an existing workspace need explicit separation.
3. Enforce purchased seat limits and fixed terms (monthly max(users,8) × ₹300; annual actual users × ₹2,500). Persist activation state so retries do not create workspaces or extend the term twice. Record paid-but-activation-pending separately from unpaid.
4. Correct Tasks-specific fulfillment email and persist an idempotent delivery/outbox state. Current `emailSentAt` check is not sufficient for concurrent delivery; provider timeout needs an uncertain-delivery state, not blind resend. Failed or cancelled payments must not issue a paid invoice.
5. Test actual provider webhook delivery and the full activation/invoice flow in an authorized isolated test environment. Mocked route tests verify signature validation and retry semantics, not provider delivery. Do not use a real customer or perform a live charge without explicit separate authorization.
6. Review the configured seller GST identity, tax classification and invoice output against the seller's authoritative records. The GST calculation tests do not certify registration or legal tax treatment.
7. WhatsApp setup guide needs clear recipient consent and a suitable approved utility template or eligible active conversation. The existing task-assignment template is not a purchase confirmation template. No WhatsApp message was sent. This delivery must be independently retryable and must not block paid access or require a second payment.

Checkout remains disabled. The current recovery release guard remains intact. No database migration, credentials change, real email, real WhatsApp message, customer invoice or charge was performed.

## Release handoff

Branch: `codex/tasks-payment-verification-20261025`, based on the current preserved Preleads release branch. This is not a complete payment-activation release. Do not deploy plain main or the non-promotable preflight job. Any future release must regenerate the checksum overlay manifest, verify current aliases, stage the preserved source, pass the application and payment gates, and then follow `PRODUCTION_FORWARD_BASELINE.md`.
