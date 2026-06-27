# Client Onboarding Readiness — 50 Users (HR Excluded)

**Date:** 2026-06-27  
**Scope:** Sheetomatic Workspace — all modules except HR  
**Target:** Onboard a BCI-style client with up to **50 users**

---

## Executive verdict

| Question | Answer |
|----------|--------|
| **Ready for 50-user client?** | **Conditional GO** — after super-admin activation + team rollout |
| **Production deploy?** | **YES** — Postgres, tenant binding, core modules shipped |
| **Self-serve signup only?** | **NO** — requires super-admin activation and entitlements |
| **Recommended plan** | **CLIENT_50 preset** (50 members, 15 FMS workflows, HR excluded) |

---

## Module audit (excluding HR)

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| **EA / Tasks** | `/app/tasks` | **Ready** | Delegation, my work, team board, MIS scores, mobile actions |
| **PC / Checklists** | `/app/checklists` | **Ready** | Templates, runs, assignee org validation |
| **FMS** | `/app/fms` | **Ready** | Forms, flow design, instances, my-stops, SLA, WA alerts, MIS |
| **Cases** | `/app/cases` | **Ready** | Legal/ops case tracking (if enabled in entitlements) |
| **Inventory (IMS)** | `/app/ims` | **Ready** | Stock ops (Growth/Enterprise entitlements) |
| **Approvals** | `/app/approvals` | **Ready** | Approve/reject wired (`reviewApproval` + UI) |
| **Reports & MIS** | `/app/reports` | **Ready** | Category summary + drill-down data view |
| **EM Ready** | `/app/em` | **Ready** | Person-wise KRA (Tasks \| FMS \| PC \| Total) |
| **Team** | `/app/team` | **Ready** | Invite members, roles, modules, password reset email |
| **Settings** | `/app/settings` | **Ready** | Workspace config, WhatsApp, modules |
| **Login / auth** | `/login` | **Ready** | Org picker, forgot/reset password, tenant redirect |
| **HR** | `/app/hr` | **Out of scope** | Excluded from CLIENT_50 entitlements |

---

## Multi-tenant SaaS (50 users)

| Capability | Status |
|------------|--------|
| Postgres + Prisma | **Done** |
| Row-level `organizationId` isolation | **Done** |
| Subdomain tenant binding | **Done** (`ensureSessionTenantHost`) |
| Org switcher ? tenant portal | **Done** |
| Plan limits on members | **Done** (when `allowedModules` set) |
| Plan limits on FMS templates | **Done** (this sprint) |
| CLIENT_50 activation preset | **Done** (on super-admin activate) |
| BCI Starter (8) / Growth (20) | **Sales tiers** — not for 50-user clients |
| Self-serve billing | **Not built** (Phase 4) |
| Email invite tokens (`Invitation` model) | **Schema only** — team uses direct add |

### CLIENT_50 entitlements (applied on activation)

- **Modules:** Tasks, FMS, Reports, Approvals, IMS, Cases — **no HR**
- **maxMembers:** 50
- **maxFmsTemplates:** 15
- **plan:** ENTERPRISE (label in UI)

---

## Security & QA

| Item | Status |
|------|--------|
| Checklist assignee cross-tenant block | **PASS** (unit tests) |
| Tenant host redirect | **PASS** (code + docs) |
| Playwright smoke | **Scaffold** (login, marketing, org API 401) |
| Full IDOR E2E with seeded DB | **Gap** — run manually before first paid client |
| FMS attachments on local disk | **P1** — migrate to S3/R2 for scale |
| `CRON_SECRET` in production | **Verify** on Vercel env |
| `AUTH_COOKIE_DOMAIN=.sheetomatic.com` | **Verify** for subdomain sessions |

**Tests:** `npm run test:unit` (12 tests pass)

---

## Onboarding runbook (first 50-user client)

1. **Owner signs up** at `/login` ? workspace stays **ONBOARDING** (hold screen).
2. **Super admin** activates workspace (AI settings or pending workspaces panel).
   - Applies CLIENT_50 entitlements automatically.
3. **Verify env:** `DATABASE_URL`, `DIRECT_URL`, email provider, `CRON_SECRET`, cookie domain.
4. **Owner** adds team at `/app/team` (up to 50 members).
5. **Seed FMS:** run `npm run db:seed-bci` on staging clone or build flows in UI.
6. **Train doers:** FMS my-stops (2-tap complete), EA task board, PC checklists.
7. **Manager review:** EM Ready + Reports MIS before first executive meeting.
8. **Smoke test** on `{slug}.sheetomatic.com` with 3 roles (owner, manager, staff).

---

## Remaining gaps (post–this sprint)

| Priority | Gap | Owner |
|----------|-----|-------|
| P1 | FMS attachments ? object storage | Backend |
| P1 | CI: unit + e2e on PR | QA |
| P1 | Seeded Playwright IDOR tests | QA |
| P2 | Scheduled task reminders cron | Backend |
| P2 | Billing / `planStatus` webhooks | SaaS |
| P2 | Invitation email flow (vs direct add) | Backend |
| P3 | HR module (when client needs it) | Product |

---

## Changes shipped in this audit sprint

- `src/lib/org-onboarding.ts` — CLIENT_50 preset
- `src/lib/org-plan-context.ts` — shared limit checks
- `src/lib/org-plan-context.test.ts` — limit unit tests
- `createFmsTemplate` — enforces `maxFmsTemplates`
- Super-admin activation — applies CLIENT_50 entitlements (no HR)
- Team invite — uses shared member limit helper

---

## Agent sign-off

| Agent | Verdict |
|-------|---------|
| **Backend** | Core actions secure; limits enforced; attachment storage is main scale gap |
| **Frontend** | Workspace modules usable; Apple design system applied; FMS work-mode polished |
| **SaaS** | Conditional GO with activation + CLIENT_50; not self-serve-only |
| **QA** | Unit tests pass; run manual subdomain + IDOR smoke before go-live |

**Bottom line:** You can onboard a **50-user client today** using super-admin activation, team invite, and BCI demo seed — excluding HR. Complete P1 attachment storage and E2E IDOR tests before treating this as enterprise-hardened.
