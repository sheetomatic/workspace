# Consolidated recovery candidate, 23 October 2026

This is a staged candidate, not a claim of production activation.

- Actual preflight: both authorized domains serve `dpl_75i2VWs4yf4BYLeEux7QmuSWJbRu`.
- Source reconciles main `2168e2504111f44ee006e839525cdbed96b7af95`, preserved release `3c586c03ebef773e07d7ecfd7e9d50621b844717`, and the current deployment's three client-billing changes and public assets.
- Restores FMS videos, FETMS service route and main's authorized field/HR screens, pricing, Templates/Tasks checkout code, and the single read-only Calendar booking importer.
- Legacy Calendar cron URL delegates to the booking importer, not a second import implementation.
- Approvals links to Conveyance; Ash Fleet is removed from shared navigation without deleting its data or routes.
- No new payment settings, messaging activation, customer notifications, calendar scopes, tenant migrations, or automatic aliases.
- The verified logo bundle is unavailable in this environment and is not integrated.

Release procedure: pinned `scripts/consolidated-release.mjs` applies the exact manifest to CURRENT deployment input. Every before and after checksum is checked. Stage with `autoAssignCustomDomains:false`; never invoke automatic alias pinning. The generated Prisma model is compared read-only with the production schema; missing columns/enums block the build. No automatic migrations. Only after successful staged smoke tests and unchanged-domain preflight may the two explicitly authorized domains be activated. Do not move unrelated domains.

Local checks: 76 focused tests passed; full TypeScript passed; 250 pages generated in production build. Authenticated Workspace, payment callbacks, live Calendar records, WhatsApp delivery and deployment remain separate verification gates.
