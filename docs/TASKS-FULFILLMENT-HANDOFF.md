# Tasks fulfillment implementation — 26 October 2026

Prepared from the current verified Audience actions release. Not deployed. Payment flag remains disabled; release guard remains intact.

## Implemented

- Verified capture invokes atomic, order-locked initial Tasks activation. A dedicated buyer workspace is created, not the seller workspace or an existing customer's tenant. Purchased monthly seats have the eight-seat minimum; yearly seats do not. Both use calendar terms clamped in IST.
- Existing account credentials/identity are not changed. New owners get an undisclosed random password hash and use the existing email reset flow. No password is sent in WhatsApp/email. Existing passwordless accounts stop for secure account setup rather than claiming successful activation.
- Activation ID and term are stored on the checkout; repeated callbacks reuse them. Session access checks hold expired purchased Tasks workspaces without changing unrelated tenants or trials.
- Tasks-specific invoice email includes the workspace sign-in URL and setup guide. Paid order cannot reopen checkout. Pending activation is distinguished from unpaid status in the order response.
- Invoice delivery serializes by order and uses a stable provider idempotency key and stable payload. First attempt is persisted before sending. Automatic resend is refused after 23 hours to avoid crossing Resend's 24-hour key retention; uncertain deliveries require reconciliation. This is not an exactly-once delivery guarantee. Provider timeout does not undo paid activation.
- Additive migration adds checkout activation/term/first-attempt columns and a restricted organization reference. Only the isolated local test database has received it.

## Evidence

- 614 non-integration tests passed, including browser tests for preserved Audience actions.
- Five isolated Postgres integration tests passed for unpaid rejection, concurrent activation/delivery, Tasks-only seat grants, preserved existing credentials, provider failure/retry, and refusal to resend outside the deduplication window.
- TypeScript no-emit check, targeted ESLint and diff checks passed.
- No real payment, customer invoice/email, WhatsApp message, production schema mutation or release was performed.

## Remaining launch gates

- A full staged production-equivalent build and authenticated checkout/setup/expiry UX checks, plus focused review of the shared session/email changes.
- Secure Razorpay Test Mode configuration and real provider callback/webhook testing against an isolated database. Existing live credentials were authenticated read-only in the previous task; that is not an end-to-end test. Never replace Production keys with test keys or insert test orders into production.
- Seller GST identity/classification and final invoice review against authoritative business records.
- Scoped additive migration executor and readiness guard for this release; do not run general migrate deploy or bypass the disabled-checkout guard.
- Provider delivery reconciliation/admin workflow for attempts beyond the retry window. Refunds/cancellations of already-paid service terms need a reviewed policy; they do not currently revoke access automatically.
- Initial checkout explicitly creates a new workspace. Existing workspace renewals/upgrades are not implemented here.
- WhatsApp guide sending remains blocked pending suitable approved utility template/recipient consent. API add-on provisioning is separate and must not be represented as automatically configured.
- Keep performance work separate. Initial read-only findings are in WORKSPACE-PERFORMANCE-AUDIT-20261026.md; authenticated latency is not verified.
