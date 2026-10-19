# Pricing clarity update — 19 October 2026

## Scope

Based on `codex/monthly-business-pricing` at `918caedfdfd55b284d4fe487a2d4f1d0fa0c6f73`, whose pricing content matches the live `/pricing` page observed on 19 October 2026.

Changes are limited to marketing pricing clarity and its tests. Prices remain ₹4,999 / ₹6,999 / ₹9,999 per month, plus GST. Plan entitlements are not changed. No database, billing, authentication, campaign, legal-policy or unrelated Fleet changes are included.

- Explain the FMS + IMS + Checklists bundle and Enterprise-only IMS inclusion.
- Derive the full module comparison from the plan cards to avoid copy drift.
- Label WhatsApp actions as trial/demo requests, not activation or confirmed appointments.
- Explain setup versus separately quoted customisation/integrations/add-ons.
- Explain which trial, billing and capacity terms need confirmation; do not invent limits, free-trial terms or cancellation promises.

## Verification

- 13 focused unit tests passed.
- ESLint passed for changed TypeScript/TSX and the browser-check script.
- Next.js webpack dev server compiled `/pricing` and returned HTTP 200.
- Browser checks passed at 390px and 1440px: prices, inherited inclusions, six WhatsApp URLs, anchors, FAQ keyboard operation, no page overflow and no uncaught page errors. Enquiries were not submitted.
- Desktop and mobile screenshots inspected.
- `git diff --check` passed.
- Full `tsc --noEmit --incremental false` failed on seven errors in unchanged tests: billing/queries (2), fleet/trip-rules (2), leads/sheet-sync-progress (2), workspace-activation-bundles (1). No pricing-file errors were reported. A production build has not been validated.

Repeat checks:

```sh
npm run test:unit -- src/lib/content/business-systems-pricing.test.ts
npx eslint src/lib/content/business-systems-pricing.ts src/lib/content/business-systems-pricing.test.ts src/components/marketing/em-ready-pricing.tsx scripts/check-pricing-clarity.mjs
npx next dev --webpack --hostname 127.0.0.1 --port 3127
```

In another terminal, with Playwright Chromium installed:

```sh
node scripts/check-pricing-clarity.mjs
```

This cloud session used the existing matching dependencies from `/workspace/workspace/node_modules` and the installed Chromium with `PRICING_TEST_CHROMIUM_PATH=/usr/bin/chromium`. No dependency or lockfile changes were necessary. The test's optional `PRICING_TEST_URL` supports a different local port and refuses a non-local hostname.

## Deployment gate

The configured Vercel credential was rejected by `/v2/user`, `/v2/teams` and `/v9/projects` with HTTP 403, `invalidToken: true`. Replace it through secure environment settings, not chat, then verify the account and the project owning `sheetomatic.com`.

The existing `scripts/apply-business-pricing.mjs` warns that production has source changes missing from Git. **Do not deploy this entire checkout or run that older apply script blindly.** Obtain the latest production source, inspect these three production files against it, and apply only the reviewed pricing diff:

- `src/components/marketing/business-systems-pricing.css`
- `src/components/marketing/em-ready-pricing.tsx`
- `src/lib/content/business-systems-pricing.ts`

Run the tests against the resulting source and create/verify a preview before promoting. Inspect the actual deployment build command: this repository's `npm run build` includes `prisma migrate deploy`. A marketing-copy update does not authorise running unrelated migrations; use a verified build path without migration side effects.

After promotion, check `https://sheetomatic.com/pricing` for the new Enterprise bundle note, the complete feature table and request-labelled CTAs; verify desktop/mobile rendering. Confirm other existing production pages are preserved. Until then this update is not live.
