# Current verified production checkpoint — 23 October 2026

- Both `sheetomatic.com` and `workspace.sheetomatic.com` were explicitly assigned and re-read on deployment `dpl_T6nW3n54EHZQsW1adQDuZjYuy6yy`.
- Actual application source: `codex/consolidated-release-20261023` at `331fe690a4964968371e7c435bf5e72cec2b3476`; PR #72. The inherited deployment Git metadata is NOT the application revision. Use `meta.consolidatedRelease` and its checksum manifest.
- This reconciles main `2168e250`, the preserved `3c586c0` features and actual live `dpl_75i2VWs4yf4BYLeEux7QmuSWJbRu` client-billing/public-asset changes. The branch contains the consolidated application files, not only a patch artifact.
- 500 non-integration tests passed under `TZ=Asia/Kolkata`; full TypeScript, 250-page build, read-only database model compatibility and 10 staged HTTP/auth-redirect checks passed. Desktop/mobile live FMS videos, FETMS, pricing, Templates and login checks passed without horizontal overflow.
- Reviewed migration `20261023080000_checkout_storage` adds only two checkout/invoice storage tables and indexes. Isolated PostgreSQL repeat execution passed. Production schema gate confirms all model columns/enums present. No payment activation, real charges, customer invoices, messages, credentials or calendar permissions were changed.
- Online checkout remains disabled. Authenticated HRMS/Meetings content, WhatsApp delivery and Calendar synchronization are NOT end-to-end verified. Existing project background schedules remain associated with the previous deployment; the additional Calendar cron was NOT activated by the scoped alias assignment. Do not claim the new Calendar schedule is live.
- The verified final logo pack was unavailable and is not included. No unrelated domains were assigned.
- PR #72 remains unmerged: this repository is connected to other Vercel projects. Do not merge main or change project hooks blindly; that can trigger unrelated releases. Do not investigate/fix unrelated Fleet/TOPS preview failures as part of this release.
- Before the next release, read actual aliases again and compare all changes against this checkpoint. Never restore an older checkpoint or select newest READY automatically. Keep scoped domain activation and staged tests mandatory.

## Historical checkpoint — 22 October 2026 (superseded, not a rollback target)

- Project: sheetomatic-redesign (prj_E2G99Y1UGVVQ7SXqmJQfVKjzy2yt).
- Both sheetomatic.com and workspace.sheetomatic.com were verified on deployment dpl_2C3TEUHc4fVjnaYwJKGMe8utX4Ls.
- Release source: codex/fms-fetms-release @ 3c586c03ebef773e07d7ecfd7e9d50621b844717.
- Build reconstructs the prior deployed input plus checksum-verified Courses, pricing, Templates, Tasks and Calendar overlays, then applies the narrow Services overlay. The deployment's inherited git metadata alone does NOT describe its final source.
- FMS: both original videos on /services/flow. FETMS: /services/field-tracking, with /app/field reusing the existing HR-authorized field screen. No new permissions or database migration.
- Workspace custom domain is now explicitly registered, fixing the Vercel SSO gate. Browser login verified; authenticated HRMS and field operations remain unverified.
- Production build/typecheck and 36 tests passed; mobile/desktop service pages checked. Live FMS, FETMS, pricing and login returned 200.

## Release rules

1. Inspect actual aliases before every release. This is a verified checkpoint, not permission to restore it over a newer authorized release.
2. Never select a deployment merely because it is newest READY, or merely from Git ancestry. Preserve all currently deployed overlays and compare customer-visible features.
3. Automatic deploy:pin/deploy:lock mutation is disabled. The old ancestry-only deploy:verify script cannot certify overlay releases; do not use its failure as authority to repoint domains.
4. Stage without custom-domain assignment, test, check aliases have not changed, then assign only the domains in the authorized scope. Do not move app/ai/learn or customer domains as a side effect.
5. One release owner. Cursor may implement scoped changes but must hand off before deployment if another owner is releasing. Do not deploy plain main over this release.
6. Never deploy or alias sheetomatic-redesign-deploy-v2 to customer domains.
