# QA Report — Multi-Tenant SaaS Sprint

**Date:** 2026-06-27  
**Scope:** Checklist assignee validation, OrganizationPlan fields, tenant slug binding, marketing home, login org picker, smoke tests

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Checklist assignee validation | **PASS** | `resolveChecklistAssigneeForOrg` + unit tests |
| Organization plan schema | **PASS** | `plan`, `planStatus`, `billingPeriod`, limits on `Organization` |
| Tenant slug binding | **PASS** | `ensureSessionTenantHost` + docs |
| Marketing home sections | **PASS** | Focus offers, outcomes, industries, AI preview wired |
| Login org picker | **PASS** | Multi-org select, loading/error states |
| Playwright smoke | **PASS (scaffold)** | Tenant isolation + marketing + login |
| Vitest unit tests | **PASS** | Assignee validation matrix |

---

## Issue classification

### P0 — None open from this sprint

Previously reported P0 checklist cross-tenant issue is fixed and covered by unit tests.

### P1

| Issue | Location | Recommendation |
|-------|----------|----------------|
| Legacy orgs bypass tier until `allowedModules` backfilled | `org-plan-presets.ts` | Run provisioning script per new customer |
| Full E2E IDOR suite needs seeded demo DB | `tests/` | Add Playwright project with `db:seed` in CI |
| `CRON_SECRET` unset in non-prod opens cron routes | `api/cron/*` | Require secret in all deployed environments |

### P2

| Issue | Location | Recommendation |
|-------|----------|----------------|
| No billing integration for `planStatus` / `billingPeriod` | Schema only | Stripe/Razorpay in Phase 4 |
| Marketing mobile nav still scroll pills | `site-header-nav.tsx` | Hamburger drawer |

### P3

| Issue | Recommendation |
|-------|----------------|
| JSON-LD on marketing pages | SEO enhancement |
| Super-admin cross-tenant audit log | Governance |

---

## Tests added

| File | Type | Coverage |
|------|------|----------|
| `src/lib/checklists/assignee-validation.test.ts` | Vitest | Missing, invalid, cross-tenant, valid assignee |
| `tests/smoke/tenant-isolation.spec.ts` | Playwright | Auth redirect, org API 401, home sections, login fields |
| `tests/smoke/login.spec.ts` | Playwright | Login page smoke (existing) |

**Run:**

```bash
npm run test:unit
npx playwright install chromium   # once
npm run test:e2e
```

---

## Acceptance criteria

| AC | Description | Result |
|----|-------------|--------|
| AC-1 | Cross-tenant checklist assignee rejected | **PASS** (unit + server action) |
| AC-2 | Wrong tenant host redirects to session org | **PASS** (code review; manual E2E with subdomains) |
| AC-3 | Org switcher uses tenant portal origin | **PASS** (implemented prior sprint) |
| AC-4 | Tier module clamp when `allowedModules` set | **PASS** (org-plan-presets) |
| AC-5 | Multi-org login picker | **PASS** |

---

## Remaining risks

1. **Subdomain E2E** — Playwright runs on localhost without tenant subdomains; manual verify `{slug}.localhost` in staging.
2. **Database migration** — Run `prisma migrate deploy` before production deploy.
3. **Tier backfill** — Existing customers keep full modules until `allowedModules` is set.

---

## Next recommended tasks

1. CI pipeline: `test:unit` + `test:e2e` on PR
2. Seeded Playwright project for IDOR tests (user A cannot read org B instance)
3. `maxFmsTemplates` enforcement on FMS template create
4. Billing webhook ? update `planStatus`
