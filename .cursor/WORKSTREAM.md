# Sheetomatic Multi-Tenant � Active Workstreams

**Project:** `sheetomatic-redesign`  
**Updated:** 2026-06-26  
**FMS reference:** `docs/BCI-FMS-SALES-KIT.md`, `.cursor/rules/fms-design-playbook.mdc`

### Phase 1 status (complete)

| Agent | Done | Next |
|-------|------|------|
| Frontend | FE-3, FE-6 | FE-1, FE-2, FE-5, login org picker |
| Backend | BE-2, BE-4 | BE-1 (verify), checklist assignee fix, tenant slug binding |
| Quality | QA-1, QA-2, QA-5 audit | Playwright smoke + tenant isolation tests |
| SaaS | SA-2, SA-4, SA-5 spec | SA-1 schema (`OrganizationPlan`), shell UX quick wins |

---

## Agent assignments

### 1. Front End Developer (`frontend-developer`)

| # | Task | Files | Priority |
|---|------|-------|----------|
| FE-1 | Wire approve/reject UI in approvals list | `src/components/saas/approvals-list.tsx` | P1 |
| FE-2 | EM deficit rollup row (Tasks\|FMS\|PC\|IMS\|Total) | `src/app/app/em/`, reports components | P1 |
| FE-3 | Mobile polish for FMS my-stops (2-tap complete) | `src/app/app/fms/my-stops/` | P1 |
| FE-4 | FMS attachment UX (progress, preview, size warn) | `fms-instance-attachments.tsx`, `attachment-limits.ts` | P2 |
| FE-5 | Marketing home � wire unused sections | `src/components/marketing/home-page.tsx` | P1 |
| FE-6 | Skip link + aria-current on marketing nav | `src/app/layout.tsx`, `components.tsx` | P2 |

### 2. Backend Developer (`backend-developer`)

| # | Task | Files | Priority |
|---|------|-------|----------|
| BE-1 | Approvals server actions (approve/reject) | `src/app/app/approvals/` | P1 |
| BE-2 | Fix client-supplied orgId in AI settings | `src/app/ai/app/settings/actions.ts` | P0 |
| BE-3 | Attachment storage ? S3/R2 design + migration | `FmsStepAttachment`, `api/fms/attachments/` | P1 |
| BE-4 | FMS AI rate limits | `src/app/app/fms/actions.ts`, `design-actions.ts` | P0 |
| BE-5 | Multi-level escalation engine | `src/lib/fms/sla.ts`, notify modules | P2 |
| BE-6 | Password reset flow | `src/lib/auth.ts`, email provider | P1 |

### 3. Quality Team (`quality-team`) � readonly

| # | Task | Scope | Priority |
|---|------|-------|----------|
| QA-1 | Full P0�P3 audit vs `AUDIT_ACTIONS.md` | Whole repo | P0 |
| QA-2 | Tenant isolation penetration test plan | All `/app/app/*/actions.ts` | P0 |
| QA-3 | FMS regression matrix | FMS module | P1 |
| QA-4 | BCI 15-min demo validation | `bci-demo` seed | P1 |
| QA-5 | Security: cron, attachments, super-admin | API routes, `auth.ts` | P0 |

### 4. SaaS Multi-Tenant (`saas-multitenant`)

| # | Task | Scope | Priority |
|---|------|-------|----------|
| SA-1 | Tenant provisioning pipeline spec | Signup ? org ? modules ? seed ? ACTIVE | P1 |
| SA-2 | BCI Starter/Growth ? `WorkspaceModule` presets | `workspace-modules.ts`, sales kit | P1 |
| SA-3 | Billing layer design (users, modules, FMS limits) | New schema + middleware | P2 |
| SA-4 | Subdomain cookie/session strategy review | `middleware.ts`, `auth.ts` | P1 |
| SA-5 | Salesforce/Zoho UI gap analysis for shell | `saas-shell.tsx`, module layouts | P2 |

---

## Parallel execution order

```
Phase 1 � DONE (2026-06-26)

Phase 2 � DONE (2026-06-27): tier schema, tenant binding, org picker, shell UX, Playwright scaffold

Phase 3 (current):
  Frontend: FE-1 (needs BE-1)
  Backend:  BE-1, BE-3
  Quality:  QA-3, QA-4

Phase 3:
  Frontend: FE-2, FE-5
  SaaS:     SA-1, SA-3
  Backend:  BE-5, BE-6
```

---

## FMS module status (baseline)

**Implemented:** forms, flow design, templates, instances, SLA, WA alerts, in-app notifications, audit, AI setup, MIS scores, 59 UI components  
**Gaps:** approvals mutations, external attachment storage, escalation chains, self-serve provisioning, billing
