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
| **Pipeline statuses** | NEW → Schedule meeting → Meeting notes → Contacted → Follow-up → Qualified → Proposal → Invoice → Payment → Project active → Won / Lost |
| **Calling / project** | `LeadCallingStatus`, `LeadProjectStatus` |
| **Sources** | WhatsApp, Instagram, Facebook, Google Sheets, Manual, API (+ ingest connections) |
| **Ingest** | `/api/leads/ingest`, Google Sheets sync, WA contact link |
| **UI** | `/app/leads` machine UI, pipeline KPI cards, period toolbar, list/detail workspace |
| **Quotations** | Builder, PDF/print, revisions, proposal/invoice types |
| **Payments** | Typed payments on lead |
| **Activity log** | `InboundLeadActivity` (note, status, call, WA, meeting, payment, quotation, sync…) |
| **Follow-ups** | Scheduled follow-ups + `nextFollowUpAt` |
| **AI** | Stage suggestion (`stage-ai`), categories |
| **Nurture** | Day-based nurture templates/triggers |
| **FMS bridge** | Optional link to FMS instance |
| **Tenant / roles** | Org-scoped queries; session roles |
| **Metrics** | Pipe value, invoice count/value KPIs |

---

## Needs improvement

| Gap | Notes |
|-----|--------|
| **Lifecycle labels** | PDF stages (Demo, Negotiation, Duplicate, Spam, Archived…) not 1:1 — map carefully; don’t explode enum without migration |
| **Activity feed UX** | Data model exists; ensure one unified timeline in lead detail |
| **Duplicate prevention** | Unique on `(org, channel, externalId)` only — **phone/email duplicates still possible** |
| **Attribution** | No first-class UTM / campaign / medium / landing page columns |
| **Lead scoring** | No Hot/Warm/Cold or configurable score |
| **Soft delete** | No `deletedAt` / archive flag |
| **Audit fields** | `createdAt`/`updatedAt`/`modifiedAt` exist; no `createdById` / `deletedBy` |
| **Kanban DnD** | Pipeline cards exist; confirm drag-drop stage moves |
| **CSV/Excel import** | Sheets sync exists; dedicated CSV import may be missing |
| **Calendar** | Meeting notes/status exist; Google Calendar not integrated |
| **Won → customer** | Sales order / project path partial vs full onboarding checklist |

---

## Missing (prioritized for MSME sell)

### P0 — do next (high ROI, no rewrite)

1. **Duplicate detection** on create/update/ingest (phone + email), suggest existing lead  
2. **Lead score** Hot / Warm / Cold (+ numeric score) with simple rules + manual override  
3. **UTM / campaign fields** on `InboundLead` (source, medium, campaign, content, term, landingPage)  
4. **Archive / soft-hide** lost spam without deleting history  

### P1 — next sprint

5. Expand status set only where sales needs it: `DEMO_SCHEDULED`, `NEGOTIATION`, `ARCHIVED` (map PDF extras)  
6. CSV import wizard  
7. Stronger AI qualification summary on lead detail  
8. Pipeline forecast (expected close + probability)  

### P2 — later / enterprise

9. Google Calendar sync  
10. Merge UI + merge history  
11. Field-level security  
12. Full marketing ROI dashboards  

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
| Discovery / Demo | `SCHEDULE_MEETING` / `MEETING_NOTES` (demo-specific TBD) |
| Proposal Sent | `PROPOSAL` |
| Negotiation | *(gap — use FOLLOW_UP or add)* |
| Payment Pending | `INVOICE` / `PAYMENT` |
| Won / Customer | `WON` + sales order |
| Lost | `LOST` |
| Duplicate / Spam / Archived | *(gap)* |

---

## Implementation order (this workstream)

1. ✅ Audit report (this file)  
2. Schema: score + UTM + archivedAt + duplicate helpers  
3. Ingest/create: duplicate check  
4. UI: score badge, archive, UTM on detail, duplicate warning  
5. Quality pass → deploy Sheetomatic when ready  

---

*Audit complete. Development starts with P0 only.*
