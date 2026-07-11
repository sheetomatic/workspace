# Lead Management — Audit vs Upgrade PDF

**Source:** `Lead Management System Audit & Upgrade.pdf`  
**Codebase:** Sheetomatic `InboundLead` CRM (`/app/leads`)  
**Date:** 11 Jul 2026  
**Rule:** Do not rebuild; preserve working features; fill real gaps only.

---

## Already implemented (preserve)

| Area | What exists |
|------|-------------|
| **Core model** | `InboundLead`, activities, follow-ups, payments, quotations, offered services, sales orders |
| **Pipeline statuses** | NEW → Schedule meeting → Meeting notes → Contacted → Follow-up → Qualified → **Demo scheduled** → Proposal → **Negotiation** → Invoice → Payment → Project active → Won / Lost |
| **Calling / project** | `LeadCallingStatus`, `LeadProjectStatus` |
| **Sources** | WhatsApp Official API intake, Instagram/Facebook Lead Ads webhooks, Telegram bot webhook, Google Sheets, Manual, API |
| **Ingest** | `/api/leads/ingest`, Google Sheets sync, WA contact link, Meta `/api/webhooks/meta/leads`, Telegram `/api/webhooks/telegram/leads/[secret]` |
| **UI** | `/app/leads` machine UI, **List \| Board** toggle, Kanban DnD, pipeline KPI cards (incl. **Forecast**), period toolbar, list/detail workspace, CSV import, settings lead-source cards |
| **Quotations** | Builder, PDF/print, revisions, proposal/invoice types |
| **Payments** | Typed payments on lead |
| **Activity log** | `InboundLeadActivity` (note, status, call, WA, meeting, payment, quotation, sync…) |
| **Follow-ups** | Scheduled follow-ups + `nextFollowUpAt` |
| **AI** | Stage suggestion (`stage-ai`) + **GPT qualification summary** (`aiSummary` / `aiSummaryAt`) |
| **Merge** | Phone/email hard + company soft duplicates; merge UI (keep primary, reassign children, soft-archive secondary via `mergedIntoId`) |
| **Calendar** | Google Calendar / Outlook web deep links + ICS download for Demo (no OAuth sync) |
| **Nurture** | Day-based nurture templates/triggers |
| **FMS bridge** | Optional link to FMS instance |
| **Tenant / roles** | Org-scoped queries; session roles |
| **Metrics** | Pipe value, invoice count/value, **weighted forecast**, KPIs |
| **P0 LMS** | Score Hot/Warm/Cold, UTM attribution, archive, phone/email duplicate detection |
| **Forecast fields** | `expectedCloseAt`, `winProbability` (override or stage default) |

---

## Needs improvement

| Gap | Notes |
|-----|--------|
| **Lifecycle labels** | PDF Duplicate/Spam/Cancelled still soft-archive / Lost — not separate statuses |
| **Activity feed UX** | Data model exists; ensure one unified timeline in lead detail |
| **Duplicate prevention** | Phone/email hard; company soft for merge UI; **GST/PAN still deferred** (no fields on InboundLead) |
| **Kanban DnD** | ✅ Shipped — Board view + drag between statuses |
| **Calendar** | ✅ Best-effort deep link + ICS; **full Google/Outlook OAuth sync deferred** |
| **Won → customer** | Sales order / project path partial vs full onboarding checklist |

---

## Missing (prioritized for MSME sell)

### P0 — shipped

1. ✅ Duplicate detection on create/update/ingest (phone + email)  
2. ✅ Lead score Hot / Warm / Cold (+ numeric score)  
3. ✅ UTM / campaign fields  
4. ✅ Archive / soft-hide  

### P1 — shipped

5. ✅ `DEMO_SCHEDULED`, `NEGOTIATION` statuses  
6. ✅ CSV import wizard (template + upload on Leads toolbar)  
7. ✅ Stronger AI qualification summary on lead detail (cached `aiSummary`)  
8. ✅ Pipeline forecast (expected close + probability + weighted KPI)  

### P1 — lead sources (shipped)

- ✅ WhatsApp Official API intake toggle  
- ✅ Facebook / Instagram Lead Ads connector + Meta webhook  
- ✅ Telegram Bot connector + webhook  

### P2 — this batch / later

9. ✅ Google Calendar **deep link + ICS** (OAuth sync still open)  
10. ✅ Merge UI + `mergedIntoId` history pointer (full merge audit trail UI still light)  
11. Field-level security  
12. Full marketing ROI dashboards  
13. Outlook **OAuth** sync, SMS, digital signature, bulk ops, dark mode, etc. (PDF Phases 10–21 stretch)

### Explicitly out of scope / avoid

- Parallel “Lead” table next to `InboundLead`  
- Replacing working quotation/payment/Sheets sync  
- JoyzAI-style customer chatbot as LMS hero  

---

## Status mapping (PDF → Sheetomatic)

| PDF stage | Sheetomatic today |
|-----------|-------------------|
| Lead Created / New | `NEW` |
| Contact Attempted / Connected | `CONTACTED` + `callingStatus` |
| Qualified | `QUALIFIED` |
| Discovery / Demo | `DEMO_SCHEDULED` (+ meeting statuses) |
| Proposal Sent | `PROPOSAL` |
| Negotiation | `NEGOTIATION` |
| Payment Pending | `INVOICE` / `PAYMENT` |
| Won / Customer | `WON` + sales order |
| Lost | `LOST` |
| Duplicate / Spam / Archived | Archive (`archivedAt`) / Lost / merge (`mergedIntoId`) |

---

## Implementation order

1. ✅ Audit report (this file)  
2. ✅ Schema: score + UTM + archivedAt + duplicate helpers  
3. ✅ Ingest/create: duplicate check  
4. ✅ UI: score badge, archive, UTM on detail, duplicate warning  
5. ✅ Lead sources connectors (WA / Meta / Telegram)  
6. ✅ Demo / Negotiation + forecast + CSV import  
7. ✅ Kanban Board + merge UI + AI summary + calendar deep links (this batch)  
8. Quality pass → deploy Sheetomatic when ready  

---

*Audit living doc — update when PDF gaps ship.*
