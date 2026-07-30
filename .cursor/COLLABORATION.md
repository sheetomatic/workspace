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

**Verified (2026-07-11):** Workspace focus-modules UX — production Ready for `df99a9f` (Sheetomatic).

| Item | Detail |
|------|--------|
| Commit | `df99a9f` — Make workspace feel faster and calmer with focus modules. |
| Branch | `main` == `origin/main` (already pushed; no re-commit) |
| Vercel | Production **Ready** |
| Deploy | `dpl_ASk9NhQComVLyqKb3d8pd99Rooh5` — https://sheetomatic-redesign-8x9b7unvd-sheetomatic.vercel.app |
| Aliases | https://sheetomatic.com / https://app.sheetomatic.com / https://workspace.sheetomatic.com |
| Superseded | `dpl_AVvcTcr1iLy5zcAdpoFxKRNFjynm` (prior Ready; no longer current) |
| Excluded | EM pricing docs/plans, BCI sales-kit edit, `.tmp-screenrec/` |

**Hard-refresh in prod:** `/app` workspace shell (focus modules / calmer sidebar).

---

**Deployed (2026-07-11):** HR/department Check List UI polish (Sheetomatic).

| Item | Detail |
|------|--------|
| Commit | `9fbcc5a` — Polish department checklist pages to a calm pro SaaS surface. |
| Branch | `main` → `origin/main` (pushed) |
| Build | `npm run test:unit` 60/60 pass; full build skipped (UI-only CSS/components) |
| Files | `team-checklist-board.tsx`, `checklists-module-nav.tsx`, `workspace-theme.css` |
| Vercel | Production **Ready** — https://sheetomatic.com / https://app.sheetomatic.com / https://workspace.sheetomatic.com |
| Deploy | `dpl_CoJxxw2E94X1DqTEiFqjaNViSRAV` — https://sheetomatic-redesign-k72h3n806-sheetomatic.vercel.app |
| Target | Sheetomatic only. Did not touch Hingorani/Tops. |
| Excluded | COLLABORATION.md, docs/*, `.tmp-screenrec/`, em-ready-plans* |

**Hard-refresh in prod:** `/app/checklists/hr` (Accounts/Maintenance share the same board).

---


## Release Ops — WhatsApp nurture welcome spam fix (2026-07-11)

**Shipped:** `160bd84` on `main` → Sheetomatic production **Ready**.

**Files:** `ingest.ts`, `merge-raw-payload.ts`, `nurture/run.ts`, `nurture/state.ts`, `nurture/nurture-idempotency.test.ts`

**Deploy:** `dpl_m1bLSX4994xPvxBEWHLj6V3iC8gD` → sheetomatic.com / app.sheetomatic.com

**Note:** Shared-repo Vercel projects (Hingorani/Tops) also received auto-deploys from this push; not intentionally targeted.


## Release Ops — HR Check List finished surface (2026-07-11)

**Shipped:** `a044a1c` on `main` → Sheetomatic production **Ready**.

**Files:** hr-checklist-board/deploy, hr-checklist-catalog, hr-deploy, checklists/hr/page, deployHrChecklistAction, checklists-module-nav, team-checklist-profiles, workspace-theme.css

**Deploy:** https://vercel.com/sheetomatic/sheetomatic-redesign/2huKgPcN2n2YhqnZc2L52rkCHLgo → sheetomatic.com / app.sheetomatic.com

**Open:** `/app/checklists/hr` (auth redirect OK)

**Excluded from commit:** COLLABORATION.md, BCI sales-kit, EM pricing docs/plans, `.tmp-screenrec/`

**Note:** Shared-repo auto-deploys for Hingorani/Tops failed; Sheetomatic-only target verified Ready. Later tip `da31e6d` supersedes on main after this ship.

---

## Release Ops — Logo→Home + widget dashboard polish (2026-07-11)

**Verified (no new commit):** `da31e6d` already on `origin/main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `da31e6d` — Make workspace logo open Home and polish the widget dashboard. |
| Files | `saas-shell.tsx`, `workspace-theme.css`, `workspace-widget-dashboard.tsx` |
| Vercel | Production **Ready** — `dpl_5CagPNs2NV4T19HAtJgmPCYjVWbJ` |
| Deploy URL | https://sheetomatic-redesign-9wzq6sway-sheetomatic.vercel.app |
| Aliases | sheetomatic.com / app.sheetomatic.com / workspace.sheetomatic.com |
| Smoke | Marketing `/` 200; `app`→`workspace` 307; `/login` 200 with `dpl_5CagPNs2NV4T19HAtJgmPCYjVWbJ` |
| Excluded | Lead sources / Meta / Telegram WIP, EM pricing docs, `.tmp-screenrec/` |

**Hard-refresh in prod:** `/app` (logo → Home, widget dashboard polish).

---

## Release Ops — Lead source live connectors + Home logo (2026-07-11)

**Shipped to Sheetomatic production only.**

| Item | Detail |
|------|--------|
| Commits | `bb8fcc4` — Harden Lead source live connectors for WA, Meta, and Telegram. |
| | `da31e6d` — Make workspace logo open Home and polish the widget dashboard. |
| Branch | `main` → `origin/main` (pushed) |
| Tests | `connection-config.test.ts` 4/4; `npm run test:unit` 71/71 |
| Migrations | No new migration in this push. `20260711140000_lead_source_telegram` already on prod (prior ship `9bc296a`). |
| Vercel | Production **Ready** — `dpl_5CagPNs2NV4T19HAtJgmPCYjVWbJ` |
| Deploy URL | https://sheetomatic-redesign-9wzq6sway-sheetomatic.vercel.app |
| Aliases | https://sheetomatic.com / https://app.sheetomatic.com / https://workspace.sheetomatic.com |
| Target | Sheetomatic only. Did not intentionally promote Hingorani/Tops. |
| Excluded | EM pricing docs/plans (`docs/EM-READY-PRICING-PLANS.md`, `src/app/em-ready-plans.ts`), `docs/BCI-FMS-SALES-KIT.md`, `.tmp-screenrec/`, COLLABORATION.md |

**Hard-refresh in prod:** `/app/leads/settings` (Lead sources — WA / Meta / Telegram connectors) and `/app` (logo → Home).

**Verify path:** Sign in → `/app/leads/settings` → Lead sources cards (workspace.sheetomatic.com redirects unauthenticated to `/login?callbackUrl=%2Fapp%2Fleads%2Fsettings`).

---

## Release Ops — Marketing Courses + YouTube placements (2026-07-12)

**Shipped:** `599a1bc` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `599a1bc` — Rebuild marketing Courses for MSME owners (24×1.5h) and place YouTube videos across home/services/courses for visual conversion. |
| Tests | `npm run test:unit` 71/71 |
| Vercel | Production **Ready** — https://vercel.com/sheetomatic/sheetomatic-redesign/7rgxCaUcx1inJgnpiqM3n6hUg7Ds |
| Deploy URL | https://sheetomatic-redesign-cqs7ff5tb-sheetomatic.vercel.app |
| Aliases | sheetomatic.com / app.sheetomatic.com |
| Target | Sheetomatic only (Hingorani/Tops auto-deploy noise ignored) |
| Excluded | `.tmp-screenrec/`, `docs/EM-READY-PRICING-PLANS.md`, `src/app/em-ready-plans.ts`, `docs/BCI-FMS-SALES-KIT.md`, COLLABORATION.md |

**Hard-refresh in prod:** `/`, `/courses`, `/services` (nav Courses, owner curriculum, YT placements).

## Release Ops — Home YouTube video refresh (2026-07-12)

**Verified (already on `origin/main`):** `02d1c1f` → Sheetomatic production **Ready**. No new commit needed; WIP docs/tmp left uncommitted.

| Item | Detail |
|------|--------|
| Commit | `02d1c1f` — Feature latest FMS and WhatsApp→Tasks videos on Home Core Offers and refresh topic embeds. |
| Files | `video-content.ts`, `home-page.tsx`, `home-proof-videos-section.tsx`, `focus-offers-section.tsx`, `ai-enabled-tasks-section.tsx` |
| Tests | `npm run test:unit` 71/71 |
| Vercel | Production **Ready** — https://sheetomatic-redesign-1zaezmo3z-sheetomatic.vercel.app |
| Aliases | sheetomatic.com / app.sheetomatic.com |
| Target | Sheetomatic only |

**Hard-refresh in prod:** https://sheetomatic.com/ (Core Offers dual pair + supporting IMS/EM/Tasks clips).

## Release Ops — Problem→Solution visual redesign (2026-07-12)

**Shipped:** `4ed55c4` on `main` → Sheetomatic production **Ready**. WIP docs/tmp left uncommitted.

| Item | Detail |
|------|--------|
| Commit | `4ed55c4038dd5a8b9d7871c6905026648498bc4c` — Make problem→solution section visual-first with FMS/IMS cards. |
| Files | FMS/IMS before-after JPGs, `problem-solution-visual.tsx/css`, sales-journey + services-hub + minimal-premium + `page-content.ts` |
| Tests | `npm run test:unit` 71/71 |
| Vercel | Production **Ready** — https://vercel.com/sheetomatic/sheetomatic-redesign/dpl_BYDyJ7gQMKRRxC4vAwZ322Pm5HYW |
| Deploy URL | https://sheetomatic-redesign-841vka3l7-sheetomatic.vercel.app |
| Aliases | sheetomatic.com / app.sheetomatic.com |
| Target | Sheetomatic only |
| Excluded | COLLABORATION.md, BCI sales kit, EM pricing docs, Graphy CSS, `em-ready-plans.ts`, `.tmp-screenrec/` |

**Hard-refresh in prod:** `/` and `/services` (Leaks closed with systems — visual FMS/IMS cards).

## Release Ops — Problem→Solution Sheetomatic branding fix (2026-07-12)

**Shipped:** `ccc429e` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `ccc429e19a0cf29ae62e6b04899512375f075160` — Replace Vyapti/StockSmart branding in marketing before/after art with Sheetomatic. |
| Files | `public/marketing/problem-solution/fms-before-after.jpg`, `ims-before-after.jpg` |
| Tests | `npm run test:unit` 71/71 |
| Vercel | Production **Ready** — `dpl_3pjAe4CESTaAc9GnQ74j6rVJ4Dv1` |
| Deploy URL | https://sheetomatic-redesign-5ohb7xxst-sheetomatic.vercel.app |
| Aliases | sheetomatic.com / www / app / ai |
| Smoke | Prod JPG Content-Length matches commit (FMS 336302, IMS 337448) |
| Target | Sheetomatic only |
| Excluded | COLLABORATION.md, BCI sales kit, EM pricing docs, Graphy CSS, `em-ready-plans.ts`, `.tmp-screenrec/` |

**Hard-refresh in prod:** `/` and `/services` (problem→solution FMS/IMS cards — no Vyapti/StockSmart in art).

## Release Ops — Workspace Home visual polish (2026-07-12)

**Shipped:** `ba62e59` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `ba62e59ced021dcd51c8164497270ac470fb005b` — Polish Workspace Home widgets (module accents, alert/clear, collection danger footer). |
| Files | `src/components/saas/workspace-widget-dashboard.tsx`, `src/components/saas/workspace-theme.css` |
| Tests | `npm run test:unit` 71/71 |
| Vercel | Production **Ready** — https://vercel.com/sheetomatic/sheetomatic-redesign/FuDd1PYpKdZygGWGcUCva9PmrCL3 |
| Target | Sheetomatic only (Hingorani/Tops auto-triggered and failed — ignored) |
| Excluded | COLLABORATION.md, docs/*, `.tmp-screenrec/`, `em-ready-plans.ts`, unrelated dirty files |

**Hard-refresh in prod:** `/app` (Workspace Home widget chrome).

## Release Ops — Ask Sheetomatic P1 + Home polish (2026-07-12)

**Shipped:** `a6d5505` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `a6d55056144df75cdc74f3af0778926d0c705644` — Harden Ask Sheetomatic markdown links + polish Workspace Home widgets. |
| P1 | Shared `isAllowedSiteAssistantHref` in `src/lib/site-assistant/links.ts`; used by `parseLinks` + `renderInlineMarkdown` (blocks `javascript:`, `//evil`, non-allowlisted hosts). |
| Home polish | Shipped — hero icons + accent/alert/clear chip CSS refinements. |
| Files | `links.ts` (new), `reply.ts`, `site-assistant.tsx`, `workspace-theme.css`, `workspace-widget-dashboard.tsx` |
| Tests | `npm run test:unit` 71/71 |
| Vercel | Production **Ready** — https://vercel.com/sheetomatic/sheetomatic-redesign/BvwgpKh45wQp1J7qSQhCZNPuX6XB |
| Target | Sheetomatic only |
| Excluded | COLLABORATION.md, BCI sales kit, EM pricing docs, Graphy CSS, `em-ready-plans.ts`, `.tmp-screenrec/` |

**Hard-refresh in prod:** `/` (Ask Sheetomatic), `/app` (Workspace Home widgets).

## Release Ops — EM Ready /pricing brand blue polish (2026-07-12)

**Shipped:** `81ab880` on `main` → Sheetomatic production **Ready**. WIP docs/tmp left uncommitted.

| Item | Detail |
|------|--------|
| Commit | `81ab880fc21034394a18963c724c2435fcd1403a` — Polish EM Ready /pricing cards to Sheetomatic brand blue standard. |
| Files | `em-ready-pricing.css`, `em-ready-pricing.tsx`, `em-ready-plans.ts` (Scale badge → Recommended) |
| Tests | `npm run test:unit` 71/71 |
| Vercel | Production **Ready** — `dpl_HHhWsXVtgPnEgdJ63Z1WtSwxX7wB` |
| Deploy URL | https://sheetomatic-redesign-7n96ewsa4-sheetomatic.vercel.app |
| Aliases | sheetomatic.com / www / app / ai |
| Target | Sheetomatic only |
| Excluded | COLLABORATION.md, BCI sales kit, Graphy CSS, `.tmp-screenrec/` |

**Hard-refresh in prod:** https://sheetomatic.com/pricing

## Release Ops — /pricing CTA hierarchy fix (2026-07-12)

**Shipped:** `2a7a5a0` on `main` → Sheetomatic production **Ready**. Follow-up tip `95825de` also **Ready** (same files, further CTA polish).

| Item | Detail |
|------|--------|
| Commit | `2a7a5a047478c7b0530cf9c3936148a5d80e67d2` — Fix /pricing CTA colors and button hierarchy (WA green, Contact button, dark-band contrast). |
| Tip | `95825de9fa1ca98f4c783557ba94d5901d4de4df` — Fix EM Ready pricing CTAs (green WA, blue Contact, ghost login, band contrast). |
| Files | `em-ready-pricing.tsx`, `em-ready-pricing.css` |
| Tests | `npm run test:unit` 71/71 |
| Vercel | Production **Ready** — `dpl_32vENjAKQQuqsgP98RpokQPgsBPp` (`2a7a5a0`); tip `dpl_3sEYBepQ5p6PDWohudX6xew4fb1Q` (`95825de`) |
| Deploy URL | https://sheetomatic-redesign-88v0fex67-sheetomatic.vercel.app |
| Prod | https://sheetomatic.com/pricing |
| Target | Sheetomatic only |
| Excluded | COLLABORATION.md, BCI sales kit, Graphy CSS, `.tmp-screenrec/` |

**Hard-refresh in prod:** https://sheetomatic.com/pricing

## Release Ops — Phase-1 Workspace how-to guides (2026-07-13)

**Shipped:** `10fbd29` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `10fbd29acbda0a0e28db20c5347ea345f816fcfb` — Ship Phase-1 workspace module how-to guides with snapshot overlays. |
| Files | `src/lib/workspace-guides/**`, `public/workspace-guides/**`, `workspace-guide-*` components, Ask-guide launcher + assistant `guideId`, page How-to buttons (Home/FMS/Tasks/EM), `HrShift` migration already applied in preflight |
| Tests | `npm run test:unit` 71/71; local `npm run build` blocked by ENOSPC (cleared `.next`); Vercel cloud build succeeded |
| Vercel | Production **Ready** — https://vercel.com/sheetomatic/sheetomatic-redesign/9bqqCHZepEVkhBnsCSNYBfxQeFtt |
| Target | Sheetomatic only (Hingorani/Tops auto-triggered — ignore) |
| Excluded | HRMS UI/schema WIP (`schema.prisma`, `hr-actions`, shifts panel), PO-without-indent WIP, Graphy CSS, BCI sales kit, `.tmp-screenrec/` |
| Note | Preflight `migrate deploy` applied `20260713130000_hrms_shifts_timing` to Neon; migration SQL included in this commit so history matches. **Backend:** still need to commit `prisma/schema.prisma` (+ remaining HRMS shifts WIP) so Prisma Client matches DB. |

**Hard-refresh in prod:** `/app` (How to use), `/app/fms/lines`, `/app/tasks`, `/app/hr/attendance`, `/app/em`, Ask guide FAB.

## Release Ops — Mobile HR Check List UX (2026-07-13)

**Shipped:** `f6182f9` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `f6182f95885fd89ba4e51614fd6551feabc3a6af` — Fix mobile HR Check List UX and bottom nav for demo readiness. |
| Files | `workspace-navigation.ts`, `workspace-navigation.mobile.test.ts`, `hr-checklist-catalog.ts`, `hr-checklist-board.tsx`, `workspace-theme.css`, `sheetomatic-ai-launcher.css` |
| Tests | `npm run test:unit` 73/73 (incl. new mobile nav tests) |
| Vercel | Production **Ready** — https://sheetomatic-redesign-6g4owhw6y-sheetomatic.vercel.app (aliases sheetomatic.com / app.sheetomatic.com) |
| Target | Sheetomatic only |
| Excluded | IMS PO WIP, BCI sales kit, Graphy CSS, COLLABORATION.md prior notes |

**Hard-refresh in prod:** `/app/checklists/hr` (mobile), bottom nav, Ask guide FAB.

## Release Ops — HR sub-modules + Task ACL (2026-07-13)

**Shipped:** `f529136` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `f529136c807ade43f5cabbd056fb051d6f78cdb5` — Enable org-level HR sub-module toggles and tighten task ACL for non-managers. |
| Files | HR pages/nav/settings, `hr-sub-modules.ts`, schema + migration `20260713140000_hr_enabled_sub_modules`, tasks ACL (`tasks.ts`, scores, verification), workspace nav/shell |
| Tests | `npm run test:unit` 73/73 |
| Migration | Applied to Neon pre-push (`enabledHrSubModules` TEXT[]); Vercel build also runs `migrate deploy` |
| Vercel | Production **Ready** — `dpl_Drabuq3a8KsmZct8dL8Vtuix7A5n` |
| Deploy URL | https://sheetomatic-redesign-nyxxn4d2b-sheetomatic.vercel.app |
| Aliases | sheetomatic.com / www / app / ai |
| Target | Sheetomatic only |
| Excluded | IMS PO WIP, BCI sales kit, Graphy CSS, COLLABORATION.md prior notes (this note appended) |

**Hard-refresh in prod:** `/app/team` (HR sub-module toggles), `/app/hr/*`, `/app/tasks`, `/app/tasks/scores`.

## Release Ops — Marketing footer redesign (2026-07-13)

**Shipped:** `1dda0c3` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `1dda0c353bcbcffef7ba5bfbac09a007e0713c13` — Redesign marketing footer with sober charcoal legal row for clearer rights, last-updated, and Terms links. |
| Files | `src/app/components.tsx` (SiteFooter), `src/components/marketing/ai-site-chrome.tsx` (AiSiteFooter), `src/app/globals.css`, `src/app/site-content.ts`, `src/app/page-content.ts` |
| Tests | `npm run test:unit` 73/73 |
| Vercel | Production **Ready** — https://vercel.com/sheetomatic/sheetomatic-redesign/7ELitmosMpRHjy6VhwpyKE9cH2pp |
| Target | Sheetomatic only (Hingorani/Tops auto-triggered and failed — ignore) |
| Excluded | IMS PO WIP, BCI sales kit, Graphy CSS, COLLABORATION.md |

**Hard-refresh in prod:** `/` (marketing footer), `/ai` (AI footer), `/terms`.


## Release Ops — Footer navy/sky palette restore (2026-07-13)

**Shipped:** `561f35b` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `561f35b88135ebaff170e88664b34b32ee103705` — Restore Sheetomatic navy/sky footer palette on the sober marketing footer. |
| Files | `src/app/globals.css` only (footer colors; layout unchanged) |
| Tests | `npm run test:unit` 73/73 |
| Vercel | Production **Ready** — https://sheetomatic-redesign-hezizzipf-sheetomatic.vercel.app (`dpl_59mErd6JgYoVfxPHFjhqDAPkTUsJ`) |
| Aliases | sheetomatic.com / www / app / ai |
| Target | Sheetomatic only |
| Excluded | IMS PO WIP, BCI sales kit, Graphy CSS, COLLABORATION.md |

**Hard-refresh in prod:** `/` (marketing footer), any page with SiteFooter.


## Release Ops — Pulse AI UX + safer contact names (2026-07-13)

**Shipped:** `dba5155` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `dba51551353b9ac49f617ed321e25b1021c322e3` — Ship Pulse branding, safer WhatsApp contact names, and simpler chatbot setup. |
| Files | Pulse launcher/voice (`sheetomatic-ai-launcher*`, `assistant-voice-button`, site/workspace assistants), AI nav Train→Connect→Go Live + Advanced, `wa-safe-customer-name` + form match / greetings / knowledge-reply / inbox cache |
| Tests | `npm run test:unit` 76/76 (greeting shortcuts already on main in `knowledge-menu.test.ts`) |
| Vercel | Production **Ready** — https://sheetomatic-redesign-mo4m3vqgc-sheetomatic.vercel.app (`dpl_Bp83Gy2UeWtFxPiUWu2AwbvrtmS6`) |
| Aliases | sheetomatic.com / www / app / ai |
| Target | Sheetomatic only |
| Excluded | IMS PO WIP, pricing/EM Ready plans, HR sub-module action guards, BCI sales kit, Graphy CSS, COLLABORATION.md |

**Hard-refresh in prod:** floating **Ask Pulse** (site + workspace), `/ai/app` dashboard/nav/onboarding, WhatsApp greetings & form ack names.

## Release Ops — WhatsApp AI names/replies/minimal path (2026-07-14)

**Shipped:** `9fa085e` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `9fa085e34ea4e18c64cac7ffe2d24aa33a49e101` — Fix WhatsApp AI names, replies, and minimal live path. |
| Files | `wa-safe-customer-name` (+tests), `wa-inbox-store`, `lead-capture`, `process-message`, live-inbox / CRM / support-hub safe display, `ai-nav-config` (Connect + CRM Advanced), `ai-dashboard-panel` tips |
| Tests | `npm run test:unit` 78/78 |
| Vercel | Production **Ready** — https://sheetomatic-redesign-dd1dmrf1j-sheetomatic.vercel.app (`dpl_EuwcWhUqTkmwquyMjgmHKv9dNi2M`) |
| Aliases | sheetomatic.com / www / app / ai |
| Target | Sheetomatic only |
| Excluded | IMS PO WIP, pricing/EM Ready plans, HR actions, BCI sales kit, Graphy CSS, wa-catalog images, COLLABORATION.md |

**Hard-refresh in prod:** `/ai/app` (nav + dashboard tips), `/ai/app/inbox`, `/ai/app/contacts`, WhatsApp inbound name handling & FAQ replies without chat lead-capture gate.


## Release Ops — CRM numbers dashboard (2026-07-14)

**Shipped:** `e91fc7e` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `e91fc7e63c70d4437e3dc1e9c5f308a955896bdc` — Add CRM numbers dashboard keyed by quotation/invoice generated date and payment received date. |
| Files | `leads/queries.ts` (`getCrmNumbersMetricsForPeriod`), `leads-numbers-dashboard.tsx`, `leads/page.tsx`, `leads-machine.css`, quotation print/builder, `leads-drawer-panel.tsx`, `my-space/page.tsx` |
| Phone prior | Already on main (`0ae07c6`) — not re-committed |
| Tests | `npm run test:unit` 78/78 |
| Vercel | Production **Ready** — https://sheetomatic-redesign-j4q233orw-sheetomatic.vercel.app (`dpl_9CKYAKtAtWiTCdRpLzCdhpYUyvyv`) |
| Aliases | sheetomatic.com / www / app / ai |
| Target | Sheetomatic only |
| Excluded | IMS PO WIP, pricing/EM Ready, HR actions, BCI sales kit, Graphy CSS, wa-catalog, COLLABORATION.md |

**Hard-refresh in prod:** `/app/leads` (Numbers dashboard), `/app/my-space`, quotation/invoice date semantics.

## Release Ops — CRM Payment received + new clients KPI (2026-07-14)

**Shipped:** `95f33e4` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `95f33e44576a02b631dafd6affae18b8952852f4` — Replace CRM Invoice count/Won% with Payment received and new clients onboarded (first invoice or payment only). |
| Files | `leads/queries.ts`, `leads-pipeline-cards.tsx`, `leads-numbers-dashboard.tsx`, `leads/page.tsx` |
| Tests | `npm run test:unit` 78/78 |
| Vercel | Production **Ready** — https://sheetomatic-redesign-pzlk8waeu-sheetomatic.vercel.app (`dpl_ARciuh8HEgCpTSkq2jxNYJnTKoTf`) |
| Aliases | sheetomatic.com / www / app / ai / `*.sheetomatic.com` |
| Target | Sheetomatic only (no Hingorani/Tops) |
| Excluded | IMS PO WIP, pricing/EM Ready, HR actions, BCI sales kit, Graphy CSS, wa-catalog, COLLABORATION.md |

**Hard-refresh in prod:** `/app/leads` pipeline cards (Payment received, Invoice value, New clients onboarded) + Numbers dashboard new-clients card.


## Release Ops — CRM scroll + Alert Center (2026-07-14)

**Shipped:** `9b4e62c` + hotfix `addd790` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Feature | `9b4e62c8d0ae8ede747b6a1a601d0d07d9f44dd5` — Fix CRM right-edge scroll and add Alert Center for payment, quotation, and negotiation WhatsApp nudges. |
| Hotfix | `addd790170142ce0bd07d8de04df5291119e6987` — Fix CRM Alert Center type error that blocked production build. |
| Files | `leads-machine.css`, nurture templates/config/state, `leads/alerts/*`, `backfill.ts`, leads actions/page, nurture messages panel, `leads-alert-center.tsx` |
| Tests | `npm run test:unit` 78/78; local `tsc --noEmit` clean after hotfix |
| First deploy | `9b4e62c` → **Error** (TS: `evaluate.ts` null filter) |
| Vercel | Production **Ready** — https://sheetomatic-redesign-1tvyx5jha-sheetomatic.vercel.app (`dpl_EwXLBRQzsGzgeQwNV4cMt5MLjTt6`, commit `addd790`) |
| Aliases | sheetomatic.com / www / app / ai / `*.sheetomatic.com` |
| Target | Sheetomatic only (no Hingorani/Tops) |
| Excluded | IMS PO WIP, pricing/EM Ready, HR actions, BCI sales kit, Graphy CSS, wa-catalog, COLLABORATION.md |

**Hard-refresh in prod:** `/app/leads` (pipeline horizontal scroll + Alert Center for payment/quotation/negotiation nudges).

## Release Ops — CRM alert evaluate TS fix (2026-07-14)

**Shipped:** `addd790` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `addd790170142ce0bd07d8de04df5291119e6987` — Fix CRM Alert Center type error that blocked production build. |
| Prior feature | `9b4e62c` Alert Center + scroll (already on main; prior deploy Errored on evaluate.ts) |
| Files | `src/lib/leads/alerts/evaluate.ts` only (for-loop `CrmAlertItem[]` push rewrite) |
| Tests | `npm run test:unit` 78/78 |
| Vercel | Production **Ready** — https://sheetomatic-redesign-1tvyx5jha-sheetomatic.vercel.app (`dpl_EwXLBRQzsGzgeQwNV4cMt5MLjTt6`) |
| Aliases | sheetomatic.com / www / app / ai / `*.sheetomatic.com` |
| Target | Sheetomatic only (no Hingorani/Tops) |
| Excluded | IMS PO WIP, pricing/EM Ready, HR actions, BCI sales kit, Graphy CSS, wa-catalog, COLLABORATION.md |

**Hard-refresh in prod:** `/app/leads` Alert Center (payment / quotation / negotiation nudges).

## Release Ops — CRM nurture TDZ / circular import (2026-07-14)

**Shipped:** `dcc7780` + build hotfix `dfee4ff` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `dcc7780679f09e835262fd6719c7d53bdcf6b8cf` — Fix CRM leads TDZ crash by breaking nurture templates/config circular import. |
| Hotfix | `dfee4ff87a6ae9437794d191c8d97061ca0dfc17` — 1-line fix in `leads-nurture-messages-panel.tsx` (webpack duplicate identifier) |
| Files | `nurture/events.ts` (new), config/templates/state/triggers, `alerts/types.ts`, nurture messages + settings panels |
| Tests | `npm run test:unit` 78/78 |
| First deploy | `dcc7780` → **Error** (webpack: Module parse failed / duplicate `saveLeadsNurtureSe…`) |
| Vercel | Production **Ready** / **PROMOTED** — https://sheetomatic-redesign-q86a5cyjk-sheetomatic.vercel.app (`dpl_FWkWs8df5k5kucMehCAfb77R34NG`, commit `dfee4ff`) |
| Aliases | sheetomatic.com / www / app / ai / `*.sheetomatic.com` |
| Target | Sheetomatic only (no Hingorani/Tops) |
| Excluded | IMS PO WIP, pricing/EM Ready, HR actions, BCI sales kit, Graphy CSS, wa-catalog |

**Hard-refresh in prod:** `/app/leads` (CRM pipeline / Alert Center — TDZ "Cannot access 'l' before initialization" fix).

## Release Ops — Official WA non-team redirect (2026-07-14)

**Shipped:** `32c2f69` on `main` → Sheetomatic production **Ready**.

| Item | Detail |
|------|--------|
| Commit | `32c2f6920039a53310858ba21ec49879766f302d` — Redirect non-team Official WhatsApp senders to communication number or enquiry form. |
| Files | `src/lib/whatsapp-bot/process-message.ts` only |
| Tests | `npm run test:unit` 84/84 |
| Vercel | Production **Ready** — https://sheetomatic-redesign-e1xh84xax-sheetomatic.vercel.app (`dpl_FDdMkWo8pTSMQtDfgofCKtovqDzZ`) |
| Aliases | sheetomatic.com / www / app / ai / `*.sheetomatic.com` |
| Target | Sheetomatic only (no Hingorani/Tops) |
| Excluded | IMS PO WIP, pricing/EM Ready, HR actions, BCI sales kit, Graphy CSS, wa-catalog |

**Hard-refresh in prod:** Official WhatsApp Cloud webhook path — non-team senders get redirect to +91 93291 03106 / enquiry form; team phones still use workspace bot.
