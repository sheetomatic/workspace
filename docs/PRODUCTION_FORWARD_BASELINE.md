# Current verified production checkpoint — 26 October 2026

- Both domains verified on `dpl_BrymVmZPNGoB2BWJVEC2aPzqXD91`, actual application source `798c082ec5d1f379b1e3c8a7b3396a18c9ad9934`, branch `codex/meta-audience-details-20261026`, PR #85.
- Audience actions now opens a native, keyboard-accessible disclosure with exact Meta field/count details and interpretation notes. Preserves the full Preleads and website source below. Payment work in PR #84 is excluded.
- Production `TEMPLATE_CHECKOUT_ENABLED` set to `false` for this authorized UI-only release; no provider credentials changed. No migrations, messages, charges, ad writes or cron-setting changes.
- 582 tests passed, including Chromium disclosure checks at 1440/390/320 with click, Enter, Space, empty state, no JavaScript and no overflow. Lint, 303 overlay checksums, staged typecheck/full 257-page build, read-only schema/Meta reporting checks and 23 smoke checks passed.
- Both aliases re-read after scoped assignment. Authenticated production browser interaction is not independently verified; component interaction passed in isolated browser tests and the production route remains login-protected.
- Controller `/workspace/audience-deployment-control.mjs` is historical and baseline-specific. Do not reuse it without checking fresh aliases and preserving the current source. Never promote the earlier read-only payment preflight job.

## Previous verified production checkpoint — 25 October 2026 (superseded)

- Both domains now verified on `dpl_9a88nq7gBnWHsm8hn4rbmVhwtc8m`, application `4b1898688f3c6b3ea122b7935ee2251cf05bc0b8`, branch `codex/preleads-hub-20261025`, PR #83.
- Shared Preleads tabs (Meta, Website Traffic, Subscribers), matching canvas, ad-level performance comparison, public double-opt-in subscription form and admin newsletter stats. Newsletter signups are not Workspace registrations. Per-ad rows are historical Insights, not live delivery states; partial results beyond 100 are disclosed.
- Scoped additive WebsiteSubscriber table and migration bookkeeping applied; no existing leads/accounts rewritten. No bulk mail, payment activation, ad writes, credential changes or general migrations. Production schema/email-config and all Meta read preflights passed. Real email deliverability not tested.
- 578 unit tests and four isolated Postgres tests passed; full 257-page local/staged build and 23 smoke/auth/origin checks passed. Authenticated isolated browser checks at 1440/390/320 covered tabs, reports and mock signup/confirmation. Live HTTP verifies subscription markup and protected routes. Live Chromium CA error prevented additional browser inspection; no TLS bypass used.
- Pending subscriber work in the old consolidated-release worktree is incorporated. Do not ship that stale checkout. Logo work remains separate. Preserve exact-source guarded deployments and verify build logs, not metadata alone.

## Previous Meta canvas checkpoint — 25 October 2026 (superseded)

- Current live domains: `dpl_7en6keCCLUK9BVrKpdipbHJjRdaT`, exact application `658b1a2023d0d5d93613fb4e01464ef4f16a9353`, branch `codex/meta-dashboard-polish-20261025`, PR #82.
- Meta canvas: responsive KPI cards, INR/count formatting, actual daily Insights chart, metric switches, accessible exact-value table, 7/30-day filters, action bars and labelled CTR/CPC. Period reach is never summed from daily rows. Missing daily reporting is not fabricated.
- 554 unit tests, lint, full local/staged 254-page build/typecheck, 283 checksum verification, schema compatibility and all 19 staged smoke checks passed. Production token passed summary and daily Insights access. Isolated authenticated browser checks at 1440/1024/390/320 passed metrics, chart/period controls, table and no overflow/errors. Signed-in production UI not inspected; live page is auth-protected.
- No migrations, customer writes, payment activation, campaign changes, credentials, subscriber rollout or logo rollout. Preserves the previous source below. Both domains assigned and re-read; public homepage/pricing/login remain available.

## Previous Meta reporting checkpoint — 25 October 2026 (superseded)

- Both aliases verified on `dpl_9RB64mKZX4tBDFskFm4e77PKeRZi`, actual source `ccfd80e6b23dc2dc58efea35f43028873bec8c72`, branch `codex/meta-stats-only-20261025`, PR #81.
- Adds primary-admin-only Meta statistics at `/app/leads/preleads/meta` linked from Preleads; selected account 1289822315977891 only. Deployment's own token passed read-only Meta Insights verification. No new scopes, credentials, ad spend, migrations, payments or messages.
- 551 tests passed; subsequent union-narrowing fix passed report tests and full 254-page build/typecheck. All 19 staged route smokes, source hashes and database compatibility passed. Isolated authenticated desktop/mobile UI renders real Meta data without errors/overflow. Live public routes and login passed; Meta route correctly requires authentication. Signed-in production browser verification unavailable.
- Subscriber and logo work is NOT included. The previous restored source e93a0dd/dpl_49wVGFuRRCCkVaU2AQ3J5MirL1R7 is preserved plus this narrow reporting change.
- Incident: default redeploys dpl_HPEwC1NhK5vLS453d5eKYBcLGQVs and dpl_4bJJiteWmwoXFfUbHKCBSxEuvXE1 inherited misleading consolidatedRelease metadata but ran default npm build instead of the overlay command. They are NOT safe rollback targets. Check build logs, not just metadata/READY. Do not use default Redeploy.
- Release controller `/workspace/meta-deployment-control.mjs` is historical, baseline-specific. Verify fresh aliases before later releases. Existing background cron settings were not changed by this scoped domain assignment.

## Previous header checkpoint — 24 October 2026 (superseded)

- Both aliases verified on `dpl_AUAKGTJ8fTg41DA8wb8Uscjwua9q`; actual application revision `f2528225692da4fd7f0054683c5563a4716074b0`, branch `codex/header-nav-polish-20261024`, PR #79.
- Public header has persistent teal selected-page tabs, click/pending/hover/focus backgrounds and improved spacing. Nested pages retain their section selection; mobile automatically reveals the selected tab. Tablet menu visibility fixed across 901–1180px. Existing links remain direct navigation, not dropdowns.
- 548 unit tests, targeted lint, full 254-page build/typecheck and 18 staging smoke checks passed. Isolated browser checks at 1440, 1181, 1024 and 390px passed for active colour, refresh, link navigation, nested routes, keyboard focus, mobile selected-tab visibility and no overflow/runtime errors.
- The same four-width checks passed on the live public site after activation. Live desktop/mobile offer-ticker regression checks also passed for automatic motion, Pause/Play, partner links, disclosures and reduced motion. Tests granted no analytics consent and submitted no customer data. Signed-in production Workspace screens were not inspected.
- No database, saved settings, credentials, permissions, payments, messages or cron changes. Preserves the latest offer ticker, Preleads and consolidated application source. Continue guarded exact-source releases and verify aliases before activation.

## Previous top-offers checkpoint — 24 October 2026 (superseded, not a rollback target)

- Both aliases verified on `dpl_2Ljh6w8qCQtEjsYsNeQgEtBBJA7z`; actual application revision `27da0f5167d22009607ccc6e9f7906426ceba9f0`, branch `codex/top-offers-ticker-20261024`, PR #78. Earlier staging candidate `dpl_2BFB8HtrqL6a5wTe3HzP6r8GZ2Js` was not activated.
- Homepage offers now run in a compact continuous text strip above navigation. Native “View all offers & links” expands stationary cards with all existing CTAs/disclosures. Preserves admin-managed content/order, adds explicit Pause/Play, mouse-only hover pause and reduced-motion support. Admin wording updated; no saved banner settings were changed.
- 545 unit tests, targeted lint, full 254-page build/typecheck and 18 staged smoke checks passed. Final isolated desktop/mobile-touch browser tests verified top placement, movement, pause/resume, correct three links/disclosures, reduced motion and no page overflow/runtime errors.
- Post-activation live homepage passed the same desktop and mobile-touch motion/link/layout checks. Public browser tests granted no tracking consent and submitted no analytics events. Workspace login remains HTTP 200 and protected Preleads/banner-admin routes redirect unauthenticated visitors; signed-in production Workspace content was not inspected.
- No migrations, production data edits, credentials, payment settings, permissions or cron changes. Previous Preleads and analytics features preserved. Continue exact-source guarded staging and scoped alias activation; never restore an older READY deployment.

## Previous Preleads checkpoint — 24 October 2026 (superseded, not a rollback target)

- Both aliases verified on `dpl_9K6Pxb5M3zPAx4ywkvvt14RWo5qS`; actual application revision `0e81c68bed0ebede4da6f0ae11e6b703c39f6216`, branch `codex/preleads-dashboard-20261024`, PR #77.
- CRM → Preleads (`/app/leads/preleads`) now exposes a primary-website-admin-only traffic dashboard; original `/app/website-traffic` URL uses the same component. Four metrics, IST daily chart/detail table, referral categories, top pages, recent 50 page views and 7/30-day filters. No visitor identification, fabricated history, lead creation or Meta Ads spend reporting.
- 545 unit tests, lint, full 254-page production build/typecheck and 18 staged smoke checks passed. Isolated signed-in desktop/mobile browser tests passed for details, charts, period selection and no overflow/runtime errors; separate isolated empty-state test verified zero-filled days and consent explanation. Signed-in production data remains unverified; no connected production browser session is available.
- No migration or production data writes; schema compatibility checked read-only. Preserves current source, credentials, cron schedules, payment settings and customer data. Prior analytics migration remains applied. Use `/workspace/preleads-deployment-control.mjs` only as historical release evidence: its baseline must be reverified for any subsequent release.

## Previous analytics checkpoint — 24 October 2026 (superseded, not a rollback target)

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
