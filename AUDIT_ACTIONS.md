# Sheetomatic — Audit Action List

**Project:** `Website Builder/sheetomatic-redesign`  
**Status check:** Marketing routes return 200. `/app` redirects to login when unauthenticated (302). Both sides working.

---

## Already applied (safe fixes — do not revert)

| Change | File(s) | Why |
|--------|---------|-----|
| Live membership revalidation on every request | `src/lib/auth.ts` | Stops revoked users keeping access via stale JWT |
| Global Google Sheet fallback disabled in production | `src/lib/integrations/resolve-sheet-id.ts` | Prevents cross-tenant dashboard data leak |
| Demo login accounts hidden outside development | `src/components/saas/login-form.tsx` | Security for production |
| Contact phones centralized | `src/app/site-content.ts`, `page-content.ts` | Single source of truth; WhatsApp line now on contact page |
| Facebook URL typo fixed | `src/app/page-content.ts` | `sheetomaticofficial` |
| SEO: `metadataBase`, Open Graph defaults | `src/app/layout.tsx` | Search + social sharing |
| Per-page metadata on all 8 marketing routes | `src/app/*/page.tsx`, `src/lib/marketing-metadata.ts` | Unique titles/descriptions |
| `sitemap.ts` + `robots.ts` | `src/app/sitemap.ts`, `robots.ts` | Crawler discovery; blocks `/app`, `/api`, `/login` |

---

## Instructions for next developer / agent

**Rule:** Keep marketing site (`/`, `/services`, …) and workspace (`/app/*`) both working after every change. Run `npm run build` before finishing.

---

### P0 — Must do before real clients

1. **Migrate SQLite → Postgres**
   - Update `prisma/schema.prisma` provider to `postgresql`
   - Set `DATABASE_URL` on Vercel/hosting
   - Run `prisma migrate deploy` in production
   - Files: `prisma/schema.prisma`, `.env.example`

2. **Add brand images**
   - Create `/public/images/sheetomatic-logo.png`, `founder-photo.jpg`, `og-default.png`
   - Referenced in `layout.tsx`, `components.tsx`, `about/page.tsx`
   - Without these, logo/OG images 404

3. **Confirm phone numbers with founder**
   - Centralized in `src/app/site-content.ts` → `contactPhones`
   - Verify WhatsApp (`9685788980`) vs voice lines are correct
   - Update `CallButton` to use primary tel from `site-content.ts`

4. **Rate-limit AI routes**
   - Add per-user/org limits on `POST /api/tasks/parse` and `/api/tasks/transcribe`
   - Files: `src/app/api/tasks/parse/route.ts`, `transcribe/route.ts`

5. **Add org picker at login** (multi-tenant UX)
   - Auth already accepts `organization` credential in `src/lib/auth.ts`
   - Login form must send org slug when user has multiple memberships
   - Add org switcher in `src/components/saas/saas-shell.tsx` using `session.update({ organizationSlug })`

---

### P1 — Marketing conversion (website)

6. **Rebuild home page** — wire existing unused components:
   - `FocusOffersSection`, `OutcomesSection`, `IndustriesSection`, `AiTaskPreview`
   - Content already in `src/app/marketing-content.ts`
   - File: `src/components/marketing/home-page.tsx`

7. **Split CSS** — marketing pages load ~3,800 lines of SaaS/login CSS
   - Move SaaS styles to `workspace-theme.css` (already imported in `app/app/layout.tsx`)
   - Trim `globals.css` to marketing-only tokens
   - Do NOT break login page styling

8. **Mobile nav** — replace horizontal scroll pills with hamburger + drawer
   - File: `src/app/components.tsx`, `minimal-premium.css`
   - Add `aria-current="page"` for active route

9. **Add skip link** in root `layout.tsx`:
   ```tsx
   <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
   ```

10. **Surface MIS pricing** from `marketing-content.ts` → `misSupportPlans` on `/services` or home

---

### P1 — Workspace completion (SaaS)

11. **Approvals workflow** — currently read-only stub
    - Add approve/reject server actions in `src/app/app/approvals/`
    - Wire "Review" button in approvals page
    - Scope all mutations by `organizationId`

12. **Team management** — currently view-only
    - Invite by email, change role, deactivate member
    - New Prisma model: `Invitation` (token, email, role, orgId, expiresAt)
    - File: `src/app/app/team/page.tsx`

13. **Reports page** — replace placeholder
    - Embed Looker Studio or link `WorkspaceLink` entries with type `LOOKER_STUDIO`
    - File: `src/app/app/reports/page.tsx`

14. **Task enhancements**
    - Edit / reassign / delete tasks
    - Filters: status, overdue, assignee
    - File: `src/app/app/tasks/actions.ts`, `task-list.tsx`

15. **Scheduled reminders cron**
    - `remindViaEmail` / `remindViaWhatsApp` only fire at assignment today
    - Add Vercel cron or queue job using `dueAt` and `nextOccurrenceAt`
    - File: `src/lib/task-reminders.ts`

16. **Remove dead code**
    - `DashboardWidgets`, `WorkspaceOverview`, `getWorkspaceDashboard`, `WorkspaceKpi` — unused
    - Wire or delete to reduce confusion

---

### P2 — Production hardening

17. **Automated tests** — Playwright is in devDependencies but unused
    - Smoke: login, role redirect, task create, tenant isolation
    - At minimum: auth + `/app` redirect + marketing 200s

18. **Audit log model** — log settings changes, task mutations, approval actions

19. **Password reset + email verification**

20. **Observability** — Sentry, structured logging on AI routes

21. **Loading skeleton** — `src/app/app/loading.tsx` uses old CSS classes; match `hs-dashboard` layout

22. **Fix decorative UI** — dashboard search + notifications bell have no handlers; either wire or remove

---

### P3 — Enterprise multi-tenant

23. Self-serve org signup + onboarding flow (`ONBOARDING` → `ACTIVE`)
24. Google OAuth (stub in `.env.example`)
25. Billing per tenant (OWNER role)
26. Data export / GDPR endpoints
27. JSON-LD structured data on home + contact

---

## Verification checklist (run after every batch)

```bash
cd "Website Builder/sheetomatic-redesign"
npm run build
npm run dev
```

| URL | Expected |
|-----|----------|
| `http://localhost:3000/` | 200 — home loads |
| `http://localhost:3000/services` | 200 |
| `http://localhost:3000/login` | 200 — no demo accounts in production build |
| `http://localhost:3000/app` | 302 → `/login` when logged out |
| `http://localhost:3000/sitemap.xml` | 200 — 8 marketing URLs |
| `http://localhost:3000/robots.txt` | 200 — disallows `/app/` |

**Login test (development only):** `owner@acme.demo` / `demo1234` → `/app` dashboard loads.

---

## Architecture reminder

```
Marketing (public)          Workspace (auth required)
├── /                       ├── /app          Dashboard
├── /services               ├── /app/tasks    Tasks + AI
├── /products               ├── /app/approvals (stub)
├── /courses                ├── /app/reports  (stub)
├── /whatsapp-api           ├── /app/team     (read-only)
├── /about                  └── /app/settings
├── /career
└── /contact

Tenant isolation: all queries filter by session.organizationId
Roles: VIEWER < STAFF < MANAGER < ADMIN < OWNER
```

Do not accept `organizationId` from client forms or API body — always derive from session.
