# Verified production release — 22 October 2026

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
