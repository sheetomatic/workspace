# Website analytics and banner administration — shipped 24 October 2026

Deployed as `dpl_JDFs7f25j1MaQ84esBGzKtDPBfhd` / application `1572460bfa448853b47cd584d6c02cba8ac29116`. Read PRODUCTION_FORWARD_BASELINE.md for evidence and forward-release rules. The initial planning checklist below is historical; its migration, isolated database/browser, disclosure, retention and deployment checks were completed. Actual Meta Events Manager receipt and signed-in production administrator access remain unverified.

Implemented:
- SunSed third default banner, exact referral URL/code; primary-organization ADMIN/OWNER or platform administrator banner CRUD/reorder. Atomic JSON settings updates and optimistic versions preserve theme settings.
- Consent-controlled Pixel 2673554139515459, public marketing host/path allowlist, no noscript bypass of consent, no automatic matching. Meta PageView deliberately skips URLs with query strings/fragments to avoid sending their content; this limits campaign attribution until reviewed.
- First-party public pageview ingestion with bounded input, deduplicated IDs, rate limits, daily hashed random visitor IDs, coarse sources only. No raw IP, URL query, form values or referrer URLs in traffic rows. Rate-limit buckets use daily hashed network identifiers.
- Admin-only Workspace dashboard link and /app/website-traffic report (30 days, IST daily grouping). Visitor totals are visitor-days, not cross-day unique people. No historical backfill.

Validation: 539 tests, final integrated build/typecheck/lint, isolated PostgreSQL and authenticated browser checks passed. Public live browser tracking was intercepted; no real test analytics events or admin changes were submitted to production. Production migration applied only the additive traffic table/indexes and migration bookkeeping. Retention removes traffic older than 30 days during subsequent collection; no cron settings were changed.

Original pre-activation checklist (completed; retained for context):
1. Test additive migration 20261024120000_website_traffic against isolated PostgreSQL and review rollback/data retention. No production migration has run. Existing release schema guard must remain enabled.
2. Test admin saved banner persistence/reorder/delete, theme preservation, tenant denial and stale-version conflict against an isolated database.
3. Browser-test consent/decline/revoke, private-route exclusions, route PageView deduplication and actual Meta requests without customer data; do not claim Events Manager receipt before verified.
4. Confirm primary organization uniqueness and admin access, update privacy disclosure to match actual data collection/retention, agree retention policy and schedule cleanup. No deletion policy is currently activated.
5. Refresh checksum manifest, stage from actual current production, pass release guards, and verify both production domains. Do not ship plain main or old snapshots.

Meta Ads spend/click/lead reporting via Marketing API is not implemented in this patch. The ongoing CRM lead crash is not resolved by this work.
