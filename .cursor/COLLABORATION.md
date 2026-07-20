# Agent Collaboration Board

**Goal:** SaaS-level multi-tenant platform ÿ agents work independently, post handoffs here.  
**Read this file before starting. Append your section when done.**

---

## Phase 2 kickoff (2026-06-26)

### Shared priorities (from Phase 1 consensus)

| P0 | Owner | Status |
|----|-------|--------|
| Checklist assignee org validation | Backend | done |
| Tenant subdomain ? session binding | Backend + SaaS | done |
| Org switcher redirects to correct tenant host | Frontend | done |
| BCI tier presets + schema | SaaS + Backend | done |
| Login org picker for multi-org users | Frontend | done |
| Shell: mobile org switcher, Apps vs Setup split | Frontend + SaaS | done |
| Playwright smoke + tenant isolation tests | Quality | scaffold done |

### Cross-agent contracts

- **Backend ? Frontend:** Tenant binding redirect URL shape; org-switch must use `tenantPortalOrigin(slug)`
- **SaaS ? Backend:** `org-plan-presets.ts` exports; schema fields for `Organization.plan`, `allowedModules`, `maxMembers`, `maxFmsTemplates`
- **SaaS ? Frontend:** Tier badge in shell footer; disable module checkboxes not in org tier
- **Quality ? All:** P0 test cases each agent must not break; append pass/fail after implementations land

---

## Backend Developer

**Completed (2026-06-27):** Phase 2 P0 ÿ checklist assignee validation + tenant subdomain binding.

### Files changed

| File | Change |
|------|--------|
| `src/app/app/checklists/actions.ts` | `createChecklistTemplateAction`: `membership.findFirst` validates `assigneeUserId` ? session org before create |
| `src/lib/tenant-host.ts` | `ensureSessionTenantHost`, `getRequestPathname`, `tenantRedirectOrigin` (localhost-aware) |
| `src/middleware.ts` | Sets `x-pathname` on tenant rewrites via `REQUEST_PATHNAME_HEADER` |
| `src/app/app/layout.tsx` | Calls `ensureSessionTenantHost(sessionUser)` after `requireSession` |

**Not changed (SaaS already landed):** `src/app/app/team/actions.ts` ÿ invite/update already wired to `src/lib/org-plan-presets.ts` (`maxMembers`, `clampModulesToOrg`, `modulesForTierRole`).

### API contracts for Frontend

**Tenant binding redirect (org-switch must align):**

When a logged-in user hits a tenant host whose slug ? `session.organizationSlug` (and user is not super-admin), the app layout issues a **server redirect**:

```
{protocol}://{session.organizationSlug}.{ROOT_DOMAIN}{pathname}{search}
```

- **Production:** `https://acme.sheetomatic.com/app/team?tab=members`
- **Local dev:** `http://acme.localhost/app/team` (when request host is `*.localhost`)
- **Generic portal (`app.sheetomatic.com`):** No redirect ÿ `getRequestTenantSlug()` is `null`
- **Super-admin:** No redirect ÿ may browse any tenant host

**Frontend org-switcher must:**

1. `await update({ organizationSlug: slug })` (existing)
2. **Navigate to** `tenantPortalOrigin(slug) + pathname` (not `router.push(pathname)` on current host)
3. Example: switching from `bci-demo` ? `acme` while on `/app/tasks` should go to `https://acme.sheetomatic.com/app/tasks`

**Checklist create error contract:**

- `{ ok: false, message: "Selected doer must be a member of this workspace." }` when `assigneeUserId` ? org

### Test cases for Quality (P0)

| # | Case | Expected |
|---|------|----------|
| T1 | POST create checklist with assignee from another org | `{ ok: false }`, no row created |
| T2 | POST create checklist with valid org member | `{ ok: true }` |
| T3 | Import checklist with unknown assignee email | Error from `template-import` (pre-existing) |
| T4 | Session org `acme`, browse `bci-demo.{domain}/app/team` | 302 ? `acme.{domain}/app/team` |
| T5 | Session org `acme`, browse `app.{domain}/app/team` | No redirect |
| T6 | Super-admin on wrong tenant host | No redirect |
| T7 | Invite member at `maxMembers` on tier-enforced org | `{ ok: false, message: "This plan allows up to N members..." }` |

### Blockers / needs from SaaS

- None for team invite ÿ `org-plan-presets.ts` + `Organization.plan` / `allowedModules` / `maxMembers` already integrated in `team/actions.ts`
- **Follow-up:** Enforce `maxFmsTemplates` on FMS template create (Backend BE-3 scope, not Phase 2 P0)
- **Follow-up:** Mirror `ensureSessionTenantHost` in `src/app/ai/app/layout.tsx` if AI portal gets tenant subdomains

---

## Front End Developer

**Phase 2 (2026-06-27)** ÿ login org picker, tenant org-switch redirect, shell UX, brand placeholders.

### Files changed
- `src/components/saas/login-form.tsx` ÿ debounced + blur `POST /api/auth/organizations`; workspace picker when `organizations.length > 1`
- `src/components/saas/organization-switcher.tsx` ÿ workspace switch uses `window.location.href = tenantPortalOrigin(slug)/app`; AI stays client-router
- `src/components/saas/saas-shell.tsx` ÿ mobile header org switcher; Apps vs Setup nav sections; optional `organizationPlan` footer badge (ADMIN+)
- `src/components/saas/workspace-theme.css` ÿ `.saas-nav-section`, `.saas-plan-badge`, `.ws-mobile-shell-org-switcher`
- `public/images/*` ÿ SVG placeholders + README for founder assets
- `src/app/site-content.ts`, `src/app/layout.tsx`, `src/app/about/page.tsx` ÿ image paths ? SVG placeholders

### UI patterns
- Login org lookup only for workspace sign-in (skips AI product, signup, and `?org=` deep links)
- Org switcher accepts optional `className` for compact mobile header variant
- Plan badge hidden until `organizationPlan` prop is passed from layout (now wired: `organization.plan` from Prisma)

### Needs from Backend
- **Tenant session binding on org switch:** after `session.update({ organizationSlug })`, tenant host (`{slug}.sheetomatic.com/app`) must accept the session cookie or re-bind org from `x-tenant-slug` header ÿ confirm cookie domain (`AUTH_COOKIE_DOMAIN`) covers tenant subdomains
- **Login with picked org:** `loginWithCredentialsAction` already validates `organization` slug when provided; no API change needed

### Needs from SaaS
- `ORG_PLAN_LABELS` from `org-plan-presets.ts` used in shell footer; tier-gated module checkboxes in Team UI remain SaaS follow-up

### Handoff to Quality
- P0: multi-org login shows picker; single-org auto-submits hidden slug; invalid credentials hide picker
- P0: org switch from `app.` host redirects to `{slug}.sheetomatic.com` preserving current `/app/*` path
- P1: mobile header org switcher visible when user has 2+ memberships
- P1: desktop sidebar shows Apps / Setup sections; plan badge only for ADMIN+ when plan prop set
- Regression: marketing `/`, `/about`, workspace `/app` nav and sign-in unchanged for single-org users

---

## SaaS Multi-Tenant Architect

**Completed:** 2026-06-27 ÿ Phase 2 BCI tier packaging + enforcement touchpoints

### Schema (`20260627120000_org_plan_tiers`)

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `Organization.plan` | `OrgPlan` enum | `BCI_STARTER` | `BCI_STARTER`, `BCI_GROWTH`, `TASKS_ADDON`, `ENTERPRISE`, `LEGAL_ADDON` |
| `Organization.allowedModules` | `WorkspaceModule[]` | `[]` | **Empty = legacy:** all modules until backfilled |
| `Organization.maxMembers` | `Int` | `8` | Enforced only when `allowedModules` non-empty |
| `Organization.maxFmsTemplates` | `Int` | `3` | Schema-ready; FMS create actions not yet clamped |

### Tier presets (`src/lib/org-plan-presets.ts`)

| Plan | Modules | maxMembers | maxFmsTemplates |
|------|---------|------------|-----------------|
| **BCI_STARTER** | FMS, REPORTS, APPROVALS | 8 | 3 |
| **BCI_GROWTH** | Starter + IMS, HR | 20 | 10 |
| **TASKS_ADDON** | TASKS only | 25 | 0 |
| **LEGAL_ADDON** | CASES, TASKS | 50 | 0 |
| **ENTERPRISE** | All 7 modules | 999 | 999 |

Exports: `modulesForTierRole`, `effectiveMemberModules`, `clampModulesToOrg`, `resolveOrgAllowedModules`, `isOrgTierEnforced`, `ORG_PLAN_LABELS`.

### Enforcement map

| Touchpoint | File | Behavior |
|------------|------|----------|
| Session modules | `src/lib/auth.ts` ? `getSessionUser` | `effectiveMemberModules(role, membership.modules, org.allowedModules)` |
| Invite member | `src/app/app/team/actions.ts` | Reject if `tierEnforced && count >= maxMembers`; clamp form modules to org tier |
| Update member | `src/app/app/team/actions.ts` | Same module clamp on save |
| Team UI checkboxes | `workspace-module-fields.tsx` | Disabled + ÿ(plan upgrade)ÿ for modules outside org tier |
| Team page data | `src/app/app/team/page.tsx` | Passes `orgAllowedModules` to panel |
| **Not yet** | FMS template create | Backend: clamp to `maxFmsTemplates` when tier enforced |
| **Not yet** | `saas-shell.tsx` | Frontend: tier badge in shell footer (`ORG_PLAN_LABELS[plan]`) |
| **Not yet** | Middleware / nav | Hide sidebar links for modules not in effective session modules (already via `hasWorkspaceModule`) |

### Backward compatibility

- Existing orgs: `allowedModules = []` ? **no tier enforcement** (all modules, no member cap).
- Migration sets defaults only; does not backfill `allowedModules`.
- Run seed or admin script to tier an org: set `plan`, `allowedModules`, `maxMembers`, `maxFmsTemplates`.
- `bci-demo` seed ? **BCI_GROWTH** with full Growth module list.

### Frontend shell requirements (handoff)

1. **Tier badge** ÿ Shell footer or org switcher: show `ORG_PLAN_LABELS[plan]`; fetch `plan` on layout or extend session.
2. **Apps vs Setup split** ÿ Starter hides IMS/HR nav when tier enforced (session modules already filtered).
3. **Upgrade CTA** ÿ When module checkbox shows ÿ(plan upgrade)ÿ, link to sales/contact (no billing yet).
4. **Org switcher** ÿ After tenant host binding lands, show plan badge per org in dropdown.

### Backend handoff

- Wire `maxFmsTemplates` in FMS template create/duplicate actions.
- Optional: provisioning pipeline sets `allowedModules` from `plan` on org create.
- P0 checklist assignee validation ÿ unchanged by this work.

---

## Quality Team

**Report date:** 2026-06-27 (Phase 2 audit)  
**Mode:** Read-only audit + test scaffold (no production code changes)

---

### Phase 1 shipped code ÿ verification

| Item | File(s) | Verdict | Notes |
|------|---------|---------|-------|
| Mobile my-stops queue (2-tap complete) | `fms-my-stops-queue.tsx`, `my-stops/[templateId]/page.tsx` | **PASS** | Mobile queue with `action=complete` deep links; desktop tracker hidden via CSS |
| Skip link | `src/app/layout.tsx` | **PASS** | `#main` target exists in marketing pages + `saas-shell.tsx` |
| `aria-current` on marketing nav | `site-header-nav.tsx` | **PASS** | Desktop + mobile nav; services dropdown sub-links included |
| AI settings orgId fix (BE-2) | `src/app/ai/app/settings/actions.ts` | **PASS** | `activateOrganizationAction` resolves org by `workspaceSlug` + `ONBOARDING`; session-scoped mutations use `user.organizationId` |
| FMS AI rate limits (BE-4) | `fms/actions.ts`, `fms/design-actions.ts` | **PASS** | `checkRateLimit` at `SCALE.AI_ROUTE_LIMIT_PER_MIN` (30/min) on form, table-calc, and flow AI actions |

---

### Phase 2 re-audit (implementations landing)

| P0 item | Owner | Verdict | Evidence |
|---------|-------|---------|----------|
| Checklist assignee org validation | Backend | **FAIL** | `createChecklistTemplateAction` writes `assigneeUserId` without `membership.findFirst` (import path validates via email map only) |
| Tenant subdomain ? session binding | Backend | **FAIL** | `app/layout.tsx` has no redirect when `getRequestTenantSlug()` ? `sessionUser.organizationSlug` |
| Org switcher ? tenant host | Frontend | **FAIL** | `organization-switcher.tsx` calls `router.push(pathname)` on same host; no `tenantPortalOrigin(slug)` |
| BCI tier presets + enforcement | SaaS + Backend | **PARTIAL** | `org-plan-presets.ts` + schema fields exist; `auth.ts`/`team/actions.ts` clamp modules ÿ legacy orgs with empty `allowedModules` bypass tier until migrated |
| Login multi-org picker | Frontend | **FAIL** | Hidden `organization` from query only; no UI when credentials match 2+ memberships |
| Playwright smoke tests | Quality | **PASS (scaffold)** | `playwright.config.ts`, `tests/smoke/login.spec.ts`, `npm run test:e2e` ÿ run `npx playwright install chromium` once before first run |

---

### Phase 2 acceptance criteria (must pass before Phase 2 close)

Each case is **manual or Playwright**; Backend/Frontend/SaaS agents append pass/fail in their sections when done.

#### AC-1 ÿ Checklist assignee cross-tenant

**Given** admin in org A (`acme-demo`), **when** `createChecklistTemplateAction` is called with `assigneeUserId` belonging to org B only, **then** action returns `{ ok: false }` and no `ChecklistTemplate` row is created.

**Steps:** Seed user `owner@bakery.demo`; POST assignee ID from bakery membership while session is acme. **Owner:** Backend.

#### AC-2 ÿ Tenant subdomain binding

**Given** user session org slug `acme-demo`, **when** they open `https://bakery-demo.sheetomatic.com/app/tasks` (or `{slug}.localhost` in dev), **then** 302 to `https://acme-demo.sheetomatic.com/app/tasks` (preserve path + query). Super-admin exempt.

**Owner:** Backend (+ SaaS for host contract).

#### AC-3 ÿ Org switcher redirect

**Given** user with memberships in `acme-demo` and `bakery-demo` on `acme-demo.*` host, **when** they select `bakery-demo` in org switcher, **then** full navigation to `https://bakery-demo.sheetomatic.com/app/tasks` (or AI home if on `/ai/app`), session updated via `update({ organizationSlug })`.

**Owner:** Frontend (uses `tenantPortalOrigin` from `workspace-auth-links.ts`).

#### AC-4 ÿ BCI tier module clamp

**Given** org with `plan: BCI_STARTER`, `allowedModules: [FMS,REPORTS,APPROVALS]` (non-empty), **when** admin invites member with IMS or TASKS checkbox, **then** saved membership modules exclude IMS/TASKS; nav/shell hides those routes for that user.

**Given** legacy org with `allowedModules: []`, **then** no clamp until SaaS migration backfill (document expected behavior).

**Owner:** SaaS + Backend.

#### AC-5 ÿ Login multi-org picker

**Given** email/password valid for 2+ orgs and no `?org=` query, **when** user submits login form, **then** UI shows org picker (or server returns actionable error listing workspaces) before `signIn`; selected slug sent as `organization` credential.

**Owner:** Frontend (+ Backend if server-side pre-validation extended).

---

### P0ÿP3 findings (current)

| Priority | Finding | Location | Owner | Status |
|----------|---------|----------|-------|--------|
| **P0** | Checklist assignee not validated against org membership | `checklists/actions.ts:64ÿ86` | Backend | Open |
| **P0** | Tenant host ? session org ÿ no redirect | `app/app/layout.tsx` | Backend | Open |
| **P0** | Brand images 404 (`/public/images/*` missing) | `layout.tsx`, `site-content.ts` | Frontend | Open |
| **P1** | Org switcher stays on wrong subdomain | `organization-switcher.tsx:35ÿ38` | Frontend | Open |
| **P1** | No login org picker for multi-org users | `login-form.tsx` | Frontend | Open |
| **P1** | Tier enforcement skipped when `allowedModules` empty | `org-plan-presets.ts:31ÿ38` | SaaS | Open (by design until migration) |
| **P2** | Cron routes allow unauthenticated GET when `CRON_SECRET` unset (non-prod) | `api/cron/*/route.ts` | Backend | Open |
| **P2** | Marketing mobile nav still horizontal scroll pills (not hamburger) | `site-header-nav.tsx` | Frontend | Open |
| **P3** | No automated tenant-isolation test suite yet | `tests/` | Quality | Scaffold only |

---

### Security findings

| Severity | Finding | Location | Fix |
|----------|---------|----------|-----|
| **High** | Cross-tenant checklist assignee injection | `checklists/actions.ts` | `membership.findFirst({ userId, organizationId })` before create |
| **High** | Session org usable on wrong tenant subdomain | `middleware.ts`, `app/layout.tsx` | Redirect to `tenantPortalOrigin(sessionSlug)` when slug mismatch |
| **Medium** | Cron endpoints open without secret in dev/staging | `api/cron/task-reminders/route.ts` etc. | Require `CRON_SECRET` in all deployed envs; document in `.env.example` |
| **Medium** | Super-admin can access any org by design | `auth.ts`, `auth-orgs.ts` | Acceptable; audit log recommended (P2) |
| **Low** | Attachments + FMS routes scoped by `organizationId` | `attachment-access.ts`, FMS actions | **PASS** ÿ spot-checked |
| **Low** | FMS AI rate limits + task parse/transcribe limits | `fms/actions.ts`, `api/tasks/parse` | **PASS** |

---

### Recommended test plan (all agents)

**Smoke (Quality ÿ scaffold added):**

```bash
npx playwright install chromium   # once per machine
npm run test:e2e                  # starts dev server; hits /login 200
PLAYWRIGHT_SKIP_WEBSERVER=1 npm run test:e2e   # if dev already running
```

**P0 manual / future e2e (before client onboarding):**

1. Tenant isolation ÿ user A cannot read/update org B FMS instance, task, checklist occurrence (IDOR on UUIDs).
2. AC-1 through AC-5 above.
3. Login revoked membership ÿ remove membership row, next request signs user out (`auth.ts` revalidation).
4. Cron ÿ `GET /api/cron/task-reminders` without Bearer ? 401 when `CRON_SECRET` set.

**FMS regression (QA-3):** intake TABLE calc + AI calc; SLA/delay with holidays; flow approve ? provision; step claim/reassign/skip/cancel; WA cron idempotency (`whatsapp*SentAt`).

**BCI demo (QA-4):** run `npm run db:seed-bci`; walk 15-min script in `docs/BCI-FMS-SALES-KIT.md` ÿ my-stops mobile queue, EM Ready, 3 split FMS.

---

### BCI demo readiness (spot check)

| Demo step | Status |
|-----------|--------|
| 3 live FMS with delays (seed) | Pass (seed exists) |
| My-stops 2-tap mobile | Pass (Phase 1 FE) |
| EM Ready board | Pass (implemented) |
| Tier-gated modules in demo | Partial (until org `allowedModules` backfilled) |
| Tenant-branded login URL | Partial (middleware sets `?org=`; binding redirect missing) |

---

### Cross-agent action items

| Agent | Action |
|-------|--------|
| **Backend** | Ship AC-1 + AC-2; require `CRON_SECRET` in staging `.env.example` note |
| **Frontend** | Ship AC-3 + AC-5; add `/public/images/sheetomatic-logo.png`, `og-default.png` |
| **SaaS** | Migration/backfill script for `allowedModules` from `plan`; document tier contract in COLLABORATION |
| **Quality** | Extend `tests/smoke/` with tenant isolation + org switcher once P0s land; run BCI demo script (QA-4) |

**Phase 1 audit reference:** Many `AUDIT_ACTIONS.md` items are stale (Postgres, approvals, team, crons done). Treat this section + AC table as source of truth for Phase 2.

---

## Release & Deploy Ops

**Deployed (2026-07-09):** Leads timestamps, phone validation, nurture WhatsApp, CRM touches.

| Item | Detail |
|------|--------|
| Commit | `7375514` — Ship lead timestamps, phone validation, nurture WhatsApp, and CRM touches. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 53/53 pass; `npm run build` pass (prisma migrate deploy + next build) |
| Migration | `20260709180000_inbound_lead_modified_at` — adds `InboundLead.modifiedAt` + index `(organizationId, modifiedAt)` |
| Vercel | Production **Ready** — https://sheetomatic.com / https://app.sheetomatic.com |
| Pre-flight fixes | `CATEGORY_BATCH` in backfill.ts; removed invalid `PROPOSAL_INVOICE` nurture mapping; google-sheets test ISO external id |

**Hard-refresh in prod:** `/app/leads`, `/app/leads/settings` (Web Based API panel, inquiry time column, calling status).

**Deployed (2026-07-09):** Lead nurture config, customizable templates, leads settings restructure.

| Item | Detail |
|------|--------|
| Commit | `cb39e24` — Ship customizable lead nurture messages and restructured leads settings. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 53/53 pass; `next build` pass (local `prisma migrate deploy` skipped — empty `DATABASE_URL`/`DIRECT_URL`; Vercel runs migrate on deploy) |
| Migration | `20260709230000_lead_nurture_config` — adds `Organization.leadNurtureConfig` JSONB |
| Vercel | Production **Ready** — Vercel – sheetomatic-redesign: success |
| Changes | Nurture message customization; lead sources roadmap (Meta/Instagram/Telegram); `isLeadNurtureSendingEnabled` credential-based; Google Sheets removed from settings page |

**Hard-refresh in prod:** `/app/leads/settings` (nurture messages panel, lead sources roadmap, Web Based API credentials).

---

**Deployed (2026-07-10):** IMS Store modules — purchase orders, PEB seed, Apple UI polish.

| Item | Detail |
|------|--------|
| Commit | `55bcade` — Ship IMS Store modules with purchase orders, PEB seed, and Apple UI polish. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 53/53 pass; local `next build` pass (prisma migrate deploy skipped — Neon unreachable locally; Vercel runs migrate on deploy) |
| Migrations | `20260710120000_ims_store_nway_phase1`, `20260710140000_ims_store_phase2`, `20260710160000_ims_store_phase3`, `20260710180000_ims_purchase_orders` |
| Vercel | Production **Ready / PROMOTED** — https://sheetomatic.com / https://app.sheetomatic.com |
| Deploy | `dpl_GzaxtsP1j7JTYCFQTQRjmgEnnuj1` — https://vercel.com/sheetomatic/sheetomatic-redesign/GzaxtsP1j7JTYCFQTQRjmgEnnuj1 |
| Pre-flight fixes | Added `WASTAGE`/`GATE_PASS` labels in `ims-movement-form.tsx`; narrowed PO status action types in list |

**Hard-refresh in prod:** `/app/ims` (store module grid), `/app/ims/purchase-orders`, `/app/ims/indents`, `/app/ims/requisitions`, sidebar IMS nav.

---

**Deployed (2026-07-10):** Leads invoice KPIs + My Space org expense tracker.

| Item | Detail |
|------|--------|
| Commit | `cea3995` — Ship Leads invoice KPIs and My Space org expense tracker. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 54/54 pass; `npm run build` pass (prisma generate + migrate deploy + next build) |
| Migration | `20260710190000_org_expense_tracker` — `OrgExpenseEntry` + category/recurrence enums |
| Vercel | Production **Ready** (Deployment has completed) — https://sheetomatic.com / https://app.sheetomatic.com |
| Deploy URL | https://sheetomatic-redesign-bzgzgzakk-sheetomatic.vercel.app |
| Note | Shared `sheetomatic/workspace` GitHub also triggered Hingorani/Tops production deploys for the same SHA (pre-existing multi-project wiring; Sheetomatic was the intended target). |

**Hard-refresh in prod:** `/app/leads` (Invoice count/value KPIs), `/app/my-space`, `/app/my-space/expenses` (My Space nav).

---

**Deployed (2026-07-10):** My Space expense redesign — fixed costs, EMI/wifi, period KPIs, household categories.

| Item | Detail |
|------|--------|
| Commit | `5c8e2ed` — Ship My Space expense redesign with fixed costs, EMI/wifi fields, and period KPIs. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 54/54 pass; `npm run build` pass (prisma generate + migrate deploy + next build) |
| Migrations | `20260710200000_org_expense_household`, `20260710210000_org_expense_emi_wifi` |
| Vercel | Production **Ready** — https://sheetomatic.com / https://app.sheetomatic.com (HTTP 200) |
| Deploy | `dpl_8K37iAhq4zsYhQ4xx7z4s3i1nWD9` — https://sheetomatic-redesign-525jezbxq-sheetomatic.vercel.app |
| Target | Sheetomatic only (verified aliases include sheetomatic.com / app.sheetomatic.com) |

**Hard-refresh in prod:** `/app/my-space`, `/app/my-space/expenses` (period KPIs, fixed expenses, EMI asset details, Internet/WiFi, household categories).

---

**Deployed (2026-07-10):** Sell-ready HR — attendance → leave → payroll, employees, salary slips.

| Item | Detail |
|------|--------|
| Commit | `a79fc7d` — Ship sell-ready HR: attendance through leave to payroll with employee registration and salary slips. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 54/54 pass; `npm run build` pass (prisma generate + migrate deploy + next build) |
| Migrations | `20260710220000_hr_payroll_salary`, `20260710230000_employee_profile_docs` |
| Vercel | Production **Ready** (Deployment has completed) — https://sheetomatic.com / https://app.sheetomatic.com |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/h4AY8XDq12xxMYtcoEygAKcHU2RF |
| Target | Sheetomatic only (intended). Shared `sheetomatic/workspace` also triggered Hingorani/Tops hooks; both **failed** (not promoted). |
| Caveat | Aadhaar/PAN still plaintext — demo OK, not a DPDP-sell claim. |

**Hard-refresh in prod:** `/app/hr`, `/app/hr/attendance`, `/app/hr/leave`, `/app/hr/payroll`, `/app/hr/employees`, `/app/hr/payroll/slip/[lineId]`.

---

**Deployed (2026-07-10/11):** HRMS Phase 1 — onboarding docs, OD/WFH, holidays, leave allocation, flexible location, field board.

| Item | Detail |
|------|--------|
| Commit | `86ccb94` — Ship HRMS Phase 1: onboarding docs, OD/WFH, holidays, leave allocation, flexible location, and field board. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 54/54 pass; Vercel production build Ready (build script runs `prisma migrate deploy`) |
| Migration | `20260710240000_hrms_phase1` |
| Vercel | Production **Ready** — https://sheetomatic.com / https://app.sheetomatic.com |
| Deploy | `dpl_3hmQ8dj7JHbwYAKQ95QJ7YEEt4EJ` — https://sheetomatic-redesign-k6v2jbm71-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops. |
| Note | Phase 2 HR work ships in a follow-up deploy. |

**Hard-refresh in prod:** `/app/hr`, `/app/hr/holidays`, `/app/hr/leave`, `/app/hr/field`, `/app/hr/employees`, `/app/hr/attendance`, `/app/team`.

---

**Deployed (2026-07-11):** HRMS Phase 2 — swap leave/off-day, live field GPS pings, visit geofence, weekend OD comp-off.

| Item | Detail |
|------|--------|
| Commit | `1bc96f4` — Ship HRMS Phase 2: swap leave/off-day, live field GPS pings, visit geofence, and weekend OD comp-off. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 54/54 pass; local `npm run build` pass; Vercel production **Ready** |
| Migration | `20260711010000_hrms_phase2` — present in build (84 migrations); already applied in `_prisma_migrations` (`finished_at` 2026-07-10T18:40:52Z); Vercel `migrate deploy` reported no pending |
| Vercel | Production **Ready** — https://sheetomatic.com / https://app.sheetomatic.com |
| Deploy | `dpl_8s9LeQCaGnNhETf9de94fxqTCxvg` — https://sheetomatic-redesign-14ue4r11i-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops. |

**Hard-refresh in prod:** `/app/hr/leave` (swap panel), `/app/hr/field` (live GPS + geofence), `/app/hr/holidays`, `/app/hr/attendance`.

---

**Deployed (2026-07-11):** WhatsApp AI homepage video embed + finalized logo/favicon (already on main via prior commits).

| Item | Detail |
|------|--------|
| Commit | `8d5bfd4` — Embed WhatsApp AI homepage video and ship finalized Sheetomatic logo favicon. |
| Prior logo | `dd01013` / `c6603e6` — growth-bars logo, real ICO favicon, AI marks, layout `?v=7` |
| Branch | `main` → `origin/main` (pushed; working tree clean) |
| Build | `npm run test:unit` 54/54 pass; Vercel production **Ready** / **PROMOTED** |
| Vercel | Production **Ready** — https://sheetomatic.com / https://app.sheetomatic.com |
| Deploy | `dpl_5cwx8AWidfptLP5vvtcvVJRGtTJ1` — https://sheetomatic-redesign-2d6lhrgnq-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops. |
| Live check | Homepage embeds `youtube.com/embed/acTJOocmuZM` for WhatsApp AI |

**Hard-refresh in prod:** `/` (homepage 2nd video), favicon/`?v=7` assets, AI launcher mark.

---

**Deployed (2026-07-11):** Finalized Sheetomatic growth-bars logo, crisp favicon, AI marks (Sheetomatic only).

| Item | Detail |
|------|--------|
| Commits | `dd01013` — Apply finalized Sheetomatic growth-bars logo, crisp favicon, and AI button marks. · `e663437` — Sync App Router favicon assets so production serves the crisp growth-bars icons. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 54/54 pass; Vercel production **Ready** |
| Vercel | Production **Ready** — https://sheetomatic.com / https://app.sheetomatic.com |
| Deploy | `dpl_7ekbrL42rQ2zUyN6JvWRFqQ2RVNp` — https://sheetomatic-redesign-2i70a1em9-sheetomatic.vercel.app |
| Live check | `/favicon.ico?v=7` 285478B · `/icon.png?v=7` 23377B · `/apple-icon.png?v=7` 7519B |
| Target | Sheetomatic only. Did not promote Hingorani/Tops. |
| Note | Next.js served stale `src/app/{favicon.ico,icon.png,apple-icon.png}` over `public/`; follow-up sync required for crisp icons. |

**Hard-refresh in prod:** hard-refresh (Cmd/Ctrl+Shift+R) on https://sheetomatic.com and https://app.sheetomatic.com — browsers cache favicons aggressively even with `?v=7`.

---

**Deployed (2026-07-11):** Leads LMS P0 — score/temperature, UTM attribution, archive, duplicates (Sheetomatic).

| Item | Detail |
|------|--------|
| Commit | `c21fc70` — Ship Leads LMS P0: score/temperature, UTM attribution, archive, and duplicate detection. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 54/54 pass; Vercel production **Ready** (GitHub deployment success) |
| Migration | `20260711120000_inbound_lead_lms_p0` — auto-applied via `prisma migrate deploy` in Vercel `build` |
| Vercel | Production **Ready** — https://sheetomatic.com / https://workspace.sheetomatic.com |
| Deploy | GitHub deploy `5401308013` — https://sheetomatic-redesign-6nomih4w9-sheetomatic.vercel.app |
| Target | Sheetomatic verified Ready. Note: shared-repo Vercel also queued Hingorani/Tops for same SHA (not intentionally promoted). |
| Excluded | EM pricing docs/plans, BCI sales-kit pricing edit, `.tmp-screenrec/` |

**Hard-refresh in prod:** `/app/leads` (Hot/Warm/Cold, attribution, archive filter, duplicates).

---

**Deployed (2026-07-11):** Leads dashboard/nav fix — card + sidebar open `/app/leads` (Sheetomatic).

| Item | Detail |
|------|--------|
| Commit | `fbe1f98` — Make dashboard Leads card and sidebar open /app/leads. |
| Branch | `main` → `origin/main` (already up-to-date; push confirmed) |
| Vercel | Production **Ready** — https://sheetomatic.com / https://app.sheetomatic.com (HTTP 200) |
| Deploy | `dpl_7PMeEYfiFhVpLrw3z4HuPjxH8Bb4` — https://sheetomatic-redesign-74u67rp76-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not touch Hingorani/Tops. |
| Excluded | Unrelated WIP left uncommitted (telegram/meta leads, EM pricing docs, prisma, COLLABORATION.md, `.tmp-screenrec/`) |

**Hard-refresh in prod:** `/app` dashboard Leads card and sidebar → `/app/leads`.

---

**Deployed (2026-07-11):** Leads PDF gaps — source connectors, Demo/Negotiation, forecast, CSV import (Sheetomatic).

| Item | Detail |
|------|--------|
| Commit | `9bc296a` — Ship Leads PDF gaps: source connectors, Demo/Negotiation, forecast, CSV import. |
| Branch | `main` → `origin/main` (pushed) |
| Build | Local `next build` pass; Vercel production **Ready** |
| Migrations | `20260711140000_lead_source_telegram`, `20260711150000_lead_demo_negotiation_forecast` (via `prisma migrate deploy` in Vercel build) |
| Vercel | Production **Ready** — https://sheetomatic.com / https://app.sheetomatic.com |
| Deploy | `dpl_DDHovGbH7osdw2SmMwwnCHZaureK` — https://sheetomatic-redesign-f7hih23ey-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops. |
| Excluded | EM pricing docs/plans, BCI sales-kit pricing edit, `.tmp-screenrec/` |

**Hard-refresh in prod:** `/app/leads` (CSV import, Forecast KPI, Demo/Negotiation stages) and `/app/leads/settings` (WA / Meta / Telegram connectors).

---

**Deployed (2026-07-14):** CRM center scroll + instant lead name filter (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/9 (merged) |
| Merge SHA | `17efa02` (tip `d27ff6b`) |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/BGEFZC4YcKJLDSfNHaGUhCPCBreS |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` (center scroll + lead name filter).

---

**Deployed (2026-07-14):** Training schedule fields — Day, Time, Frequency, Start, Sessions, Meet (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/10 (merged) |
| Merge SHA | `56d3b1d` (tip includes `ffa6e22` CSS polish + `30579c9` schedule fields) |
| Migration | `20260714180000_training_schedule_fields` — applied via `prisma migrate deploy` in Vercel build |
| Pre-flight | `TZ=Asia/Kolkata npm run test:unit` 84/84 pass (UTC flake on google-sheets timestamp test is pre-existing) |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/7fbykpcaurjhd1EA6N4txRMZRDcL — https://sheetomatic-redesign-7nvj8axfl-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` Training tab + Approvals training booking (schedule fields).

---

**Deployed (2026-07-14):** Flexible two-day training slots incl. Sunday 9 AM–5 PM IST (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/11 (merged) |
| Merge SHA | `dda641f` (tip `b8f9a85`) |
| Migration | `20260714190000_training_flexible_weekdays` — CUSTOM cohort + `weekdaysCsv`; `sessionTimeIst` default 09:00 — applied via `prisma migrate deploy` in Vercel build |
| Pre-flight | Unit tests: 83/84; remaining UTC flake on `google-sheets` timestamp test is pre-existing (`TZ=Asia/Kolkata` → 84/84) |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/HxdCeMnC2p2JJNNjJZVxsoREEKqm |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` Training tab (Day 1 + Day 2, Sunday allowed, 9:00–17:00 IST) + Approvals training booking.

---

**Deployed (2026-07-14):** Training window 8:30–6:00 IST + single-day / 3-hour sessions (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/12 (merged) |
| Merge SHA | `d05bb6a` (tip `108e1ea`) |
| Migration | `20260714200000_training_window_830_1800` — applied via `prisma migrate deploy` in Vercel build |
| Pre-flight | Unit tests: 83/84; remaining UTC flake on `google-sheets` timestamp test is pre-existing on main |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/b1AurUtuZ9bFnzGBfPcMidL2ZNM5 |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` Training tab (8:30–18:00 IST, optional Day 2, 3h sessions) + Approvals training booking.

---

**Deployed (2026-07-14):** My Space Training — student-wise schedules and Meet join links (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/13 (merged) |
| Merge SHA | `412cd77` (tip `0c776f4`) |
| Pre-flight | `TZ=Asia/Kolkata npm run test:unit` 84/84 pass |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/F1hopj3ajABELEqDu9evTbss9DBv — https://sheetomatic-redesign-fokq1akp6-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/my-space/training` (student-wise list; expand for schedule + Meet join).

---

**Deployed (2026-07-14):** CRM Training tab UI cleanup — calm standard form, no calendar clutter (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/14 (merged) |
| Merge SHA | `a9a0b9d` (tip `9801bcb`) |
| Pre-flight | Unit tests: 83/84; remaining UTC flake on `google-sheets` timestamp test is pre-existing on main |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/BxBQG7qAxMfe5Jjr2Mk83joXi1gP |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` Training tab (schedule + session + join form; no Google Calendar embed clutter).

---
**Deployed (2026-07-14):** CRM lead save/status refresh + HRMS holiday Save & publish (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/15 (merged) |
| Merge SHA | `d984340` (tip `e1ea8dc`) |
| Pre-flight | Unit tests: 83/84; remaining UTC flake on `google-sheets` timestamp test is pre-existing on main |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/8TB9qKfDM839AErzwbJpCwMs1yMX — https://sheetomatic-redesign-lej45t3ai-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` (status/owner/save refresh) + HRMS holiday admin (Save & publish / plus-to-expand form).

---

**Deployed (2026-07-15):** Stop welcome WhatsApp from saying “General inquiry” (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/16 (merged) |
| Merge SHA | `6e4d40b` (tip `1bdd29a`) |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/8TZFJdJGLW5P21gcB7eiXxFC14u2 — https://sheetomatic-redesign-2kvmo6r6i-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed/pending; ignored). |

**Hard-refresh in prod:** nurture welcome WhatsApp path (requirement phrase no longer falls back to “General inquiry”).

---

**Deployed (2026-07-15):** HRMS success feedback after every action (check-in style) (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/17 (merged) |
| Merge SHA | `0cf982f` (tip `4ab53ee`) |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/EJqJfm5azBTXSadGAnPrA3AnLYWK — https://sheetomatic-redesign-e9huyv5gj-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** HRMS verify / payroll / onboarding / profile (and other HR actions with check-in style success banners).

---

**Deployed (2026-07-15):** Fix Leads Settings scroll only working from the edge (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/18 (merged) |
| Merge SHA | `1877d67` (tip `2d5656a`) |
| Pre-flight | Unit tests: 93/94; remaining UTC flake on `google-sheets` timestamp test is pre-existing on main |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/GkpxTrWtS5UvByL6yWxwWcCknZNk — https://sheetomatic-redesign-jy9yhfwri-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (ignored auto-deploys). |

**Hard-refresh in prod:** `/app/leads` (Settings + list/CRM center scroll; wheel should work across the page, not only from the edge).

---


**Deployed (2026-07-15):** Fix Google Sheets import missing CRM leads (through row 897) (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/19 (merged) |
| Merge SHA | `59b1dc6` (tip `f707567`) |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/Fm1bAL67D1YfcMv9RT5qYxCUe648 — https://sheetomatic-redesign-furwar240-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` — Admin should click **Full re-import** to pull missing sheet rows (including Yogesh Arun Borade).

---

**Deployed (2026-07-15):** Make CRM lead status/save updates feel instant (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/20 (merged) |
| Merge SHA | `05f514b` (tip `10b5a01`) |
| Pre-flight | Unit tests: 100/101; remaining UTC flake on `google-sheets` timestamp test is pre-existing on main |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/FsdNJBU1oBCSvtuDbc7GbnAcyMyQ — https://sheetomatic-redesign-bd4ojkb01-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` — status changes, drawer field saves, and kanban moves should feel instant (no full page refresh); sheet sync continues in background.

---

**Deployed (2026-07-20):** CRM Meeting — schedule from panel, email client calendar link (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/26 (merged) |
| Merge SHA | `136dc02` (feature `aacb207`) |
| Pre-flight | Unit tests: 101/101 with `TZ=Asia/Kolkata`; UTC flake on `google-sheets` timestamp test is pre-existing |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/3HcBLM9KUwjja1GkepL7wGVaLEoG — https://sheetomatic-redesign-6p4b5noov-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (ignored auto-deploys). |

**Hard-refresh in prod:** `/app/leads` Meeting tab — schedule client meeting from panel; client should receive calendar-add email invite.

---

**Deployed (2026-07-20):** CRM lead tabs — Meeting calendar, Payment WA, multi-project Projects (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/27 (ready → merged squash) |
| Merge SHA | `8f99489` (features `43c0fa1`, `36dc2df`) |
| Pre-flight | Unit tests: 101/101 with `TZ=Asia/Kolkata`; UTC flake on `google-sheets` timestamp test is pre-existing |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/7U9AbiJawUdj7g8TQfJzYvhZP4UJ — https://sheetomatic.com |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` lead drawer tabs — Meeting / Payment / Projects (multi-project); Payment Send WA force path after PAYMENT status.

---

**Deployed (2026-07-20):** CRM sub-modules — Meetings, Quotations, Payments, Projects, Training lists (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/28 (draft → ready → merged squash) |
| Merge SHA | `f6060b1` |
| Pre-flight | Unit tests: 101/101 with `TZ=Asia/Kolkata`; UTC flake on `google-sheets` timestamp test is pre-existing |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/FQoMQSKEup3JaW9Z6BSKhHKbTM43 — https://sheetomatic-redesign-gdzflmld6-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` — left nav CRM sub-modules (Meetings / Quotations / Payments / Projects / Training) with counts/values; list pages with KPIs.

---

**Deployed (2026-07-20):** CRM instant saves, Activity tab, kanban deal totals, SO N+1 fix (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/29 (draft → ready → merged squash) |
| Merge SHA | `ab9fb47` |
| Pre-flight | Unit tests: 101/101 with `TZ=Asia/Kolkata`; UTC flake on `google-sheets` timestamp test is pre-existing |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/6zCr65ov4CEAthK8VVgaDAuYrSSX — https://sheetomatic-redesign-jzhi18lba-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (their auto-deploys failed; ignored). |

**Hard-refresh in prod:** `/app/leads` — drawer edits should save instantly (no full revalidate); Activity tab; kanban column deal totals; deferred meeting email.

---

**Deployed (2026-07-20):** CRM list compact — remove Lead Stage, fix truncated Category/Status dropdowns (Sheetomatic).

| Item | Detail |
|------|--------|
| PR | https://github.com/sheetomatic/workspace/pull/30 (draft → ready → merge commit) |
| Merge SHA | `607d045b194d8276d590a4640ae804ed771112a9` |
| Pre-flight | Unit tests: 100/101; UTC flake on `google-sheets` timestamp test is pre-existing on main (passes with `TZ=Asia/Kolkata`) |
| Vercel | Production **SUCCESS** — sheetomatic-redesign |
| Deploy | https://vercel.com/sheetomatic/sheetomatic-redesign/Byfwi5Qw4NMX2RQSsRAbAgBm5JxP — https://sheetomatic.com |
| Target | Sheetomatic only. Did not promote Hingorani/Tops (auto-deploys ignored). |

**Hard-refresh in prod:** `/app/leads` list — no Lead Stage column; Category/Status selects show full labels; denser row padding.

---
