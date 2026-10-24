# Current verified production checkpoint — 24 October 2026

- Both aliases verified on `dpl_JDFs7f25j1MaQ84esBGzKtDPBfhd`; actual application revision `1572460bfa448853b47cd584d6c02cba8ac29116`, branch `codex/sunsed-banner-20261024`, PR #76. Earlier candidate FYhHs was not activated.
- Added SunSed third banner, primary-organisation/admin banner editing at `/app/settings/banners`, consent-controlled Pixel 2673554139515459 and first-party `/app/website-traffic` reporting linked from the dashboard. Preserves previous consolidated application source.
- Scoped additive WebsitePageView migration is applied and recorded; primary-organisation uniqueness and generated schema compatibility passed. Existing cron settings, credentials, payment configuration and customer records were not changed.
- 539 tests, full 253-page build/typecheck, lint, 17 staged route/asset/auth checks passed. Isolated PostgreSQL tests covered repeat migration, banner concurrency/theme preservation, deduplication and IST reporting. Isolated signed-in browser tested admin add/edit/reorder/remove persistence and visible fixture traffic count. Real isolated collector HTTP tested storage, deduplication and 30-day retention without affecting unrelated data.
- Live desktop/mobile public-page tests verified SunSed and consent behaviour with outbound traffic/Meta events intercepted to avoid contaminating production. Meta library returned HTTP 200; actual Events Manager receipt is not verified. Live admin/report routes correctly redirect unauthenticated users; no signed-in production session was available. Invalid private-page traffic submission returned 400 without storage.
- Pixel excludes query/fragment/private-referrer contexts, which limits attribution. No historical traffic backfill or Marketing API ad-spend reporting. The previously reported CRM backend crash remains unresolved.
- Keep checksum-gated forward releases. Do not deploy plain main or select newest READY automatically. PRs remain unmerged to avoid other connected projects.

## Previous CRM reliability checkpoint — 24 October 2026 (superseded, not a rollback target)

- Both aliases verified on `dpl_DvXezbe62RvuNH6AvsbnbU8b9aQ5`; actual app revision `6bdf3ea1c9d8a93e6917f4c03559094c5ed64bb5`, branch `codex/crm-search-reliability-20261024`, PR #75.
- Preserves the festive/image/consolidated source. CRM saved-lead search no longer blocks on Google Sheets import; explicit Sheet-search button retains that capability. Immediate filtering of currently loaded rows is provisional until server results arrive. Added drawer timeout/error/close/retry and stale-result isolation; improved phone query formatting without rewriting stored data.
- 509 unit tests passed, including null/rejection/timeout/cancellation/retry and phone matching; targeted lint and final TypeScript/250-page build passed. Staged schema compatibility and 15 smoke checks passed. Live unauthenticated `/app/leads?page=1&q=908` redirects to login correctly.
- No authenticated production CRM session was available: the exact backend failure from the user's screenshot and signed-in search performance remain unverified. Do not represent error recovery as proof that the original lead now loads. No migration, real lead edits/imports, messages or permission changes were performed during testing/release.
- PR #75 targets the preserved banner branch; do not merge plain main or repoint unrelated project domains. Read actual aliases before any later release.

## Previous festive checkpoint — 23 October 2026 (superseded, not a rollback target)

- Both public aliases verified on `dpl_HK7DwWSVHn7oRwypWSE18yiq1ApK`; actual application revision `4cd162c3f133c184a4e736150a6d931fb66bf79a` on `codex/diwali-banner-20261023`, PR #74. The superseded first staging candidate was never activated.
- Homepage-only Diwali carousel: Sheetomatic no-setup-cost/services-only offer first, AgentDaftar referral second. No invented discount or expiry and no billing configuration changes. Preserves all image repairs and previous consolidated source.
- 502 tests, lint, full build/typecheck and 15 staged smoke checks passed. Live desktop/mobile checks passed for initial offer, manual controls, external referral target, automatic rotation/pause and no horizontal overflow or JS errors. Workspace login returns 200; authenticated Workspace content remains outside this check.
- No database writes, credentials, messages, payments or background-schedule changes. PR #74 targets the preserved image branch, not main. Read actual aliases again before the next release; do not restore older checkpoints.

## Previous image-repair checkpoint — 23 October 2026 (superseded, not a rollback target)

- Both `sheetomatic.com` and `workspace.sheetomatic.com` now resolve to `dpl_As3pjkCEQitYAbZcKnLeR2fz3yCp`, verified after scoped activation.
- Actual application source: `codex/image-audit-20261023` at `57bb66894b8f7da636845182a305b691a9cde87f`; PR #73 targets the preserved consolidated branch, not main. Inherited deployment Git metadata remains unsuitable as source evidence.
- Preserves the consolidated checkpoint below; repairs the missing homepage image using the existing dashboard example, restores contact QR/vCard, and adds external client-logo/video-image failure fallbacks. The final logo Library pack is still not included.
- 502 non-integration tests, full production build/typecheck, read-only schema compatibility, and 15 staged route/asset/auth checks passed. Post-activation audit of 34 public pages found no broken rendered images or page runtime errors. Home, Contact, About and Courses passed at 1440px and 390px with external-image failures simulated; no horizontal overflow. Live homepage image optimization and Workspace login both returned 200.
- YouTube thumbnail access is denied from this environment; direct and optimized thumbnail requests were blocked locally in browser tests to exercise fallback without retrying the denied host. External thumbnail availability is not certified. Authenticated Workspace screens remain unverified.
- This release ran no migrations and changed no credentials, payment settings, messages, Calendar permissions or background schedules. Both PRs remain unmerged to avoid unrelated project releases.
- Before any next release, verify current aliases and preserve this source. Do not restore the superseded checkpoints below.

## Previous consolidated checkpoint — 23 October 2026 (superseded, not a rollback target)

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
