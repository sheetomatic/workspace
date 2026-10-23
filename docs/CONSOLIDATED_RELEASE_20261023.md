# Consolidated recovery candidate, 23 October 2026

Activated on both authorized domains as deployment `dpl_T6nW3n54EHZQsW1adQDuZjYuy6yy`, application revision `331fe690a4964968371e7c435bf5e72cec2b3476`. Read the current production checkpoint for verification limits and the unmerged PR status.

- Actual preflight: both authorized domains serve `dpl_75i2VWs4yf4BYLeEux7QmuSWJbRu`.
- Source reconciles main `2168e2504111f44ee006e839525cdbed96b7af95`, preserved release `3c586c03ebef773e07d7ecfd7e9d50621b844717`, and the current deployment's three client-billing changes and public assets.
- Restores FMS videos, FETMS service route and main's authorized field/HR screens, pricing, Templates/Tasks checkout code, and the single read-only Calendar booking importer.
- Legacy Calendar cron URL delegates to the booking importer, not a second import implementation.
- Approvals links to Conveyance; Ash Fleet is removed from shared navigation without deleting its data or routes.
- No new payment settings, messaging activation, customer notifications, calendar scopes, tenant migrations, or automatic aliases.
- The verified logo bundle is unavailable in this environment and is not integrated.

Release procedure: pinned `scripts/consolidated-release.mjs` applies the exact manifest to CURRENT deployment input. Every before and after checksum is checked. Stage with `autoAssignCustomDomains:false`; never invoke automatic alias pinning. A read-only production schema check found only TemplateCheckout and TemplateInvoiceCounter absent. The explicit `20261023080000_checkout_storage` migration creates those two empty tables and indexes in one transaction and records its checksum; no existing data or pending migration backlog is modified. Repeated execution validates its checksum and skips. Checkout activation remains disabled. The generated Prisma model is then compared read-only with production; missing columns/enums block the build. Only after successful staged smoke tests and unchanged-domain preflight may the two explicitly authorized domains be activated. Do not move unrelated domains.

Local checks: 500 tests passed using TZ=Asia/Kolkata (the Sheets timestamp fixture assumes India time); full TypeScript passed; 250 pages generated in production build. Authenticated Workspace, payment callbacks, live Calendar records, WhatsApp delivery and deployment remain separate verification gates.
