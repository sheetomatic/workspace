# EM Ready pricing plans — discussion draft

**Updated:** 12 Jul 2026  
**Status:** Live on `/pricing` (Starter → Growth → Scale; 50+ = Contact us)  
**Currency:** INR, excl. GST  
**Audience:** Indian MSMEs / mid-market / BCI alumni (ops OS, not WhatsApp chatbot)

---

## Decision checklist

1. Lock **Starter ₹4,999 / 8 users**?
2. Tasks **included** in Starter vs add-on?
3. Storage: **10 GB** Starter OK?
4. Approve **Scale (50)** and **Enterprise (100+)** list prices below?
5. **Must:** move attachments to object storage (S3/R2) before selling 50–100+ (BYTEA will destroy margin)?

---

## Plan ladder

### 1) EM Ready Starter — ₹4,999 / month

| | |
|--|--|
| **Users** | **8** included (minimum) |
| **Price** | **₹4,999 / mo** · **₹49,990 / yr** |
| **Modules** | FMS + Reports + Approvals + EM Ready + Tasks |
| **FMS** | Up to **3** |
| **Storage** | **10 GB** |
| **Extra seat** | **₹599 / user / mo** |

---

### 2) EM Ready Growth — ₹9,999 / month

| | |
|--|--|
| **Users** | **20** included |
| **Price** | **₹9,999 / mo** · **₹99,990 / yr** |
| **Modules** | Starter + **IMS** + **HR** |
| **FMS** | Up to **10** |
| **Storage** | **25 GB** |
| **Extra seat** | **₹499 / user / mo** |

---

### 3) EM Ready Scale — ₹24,999 / month *(new — mid-market)*

| | |
|--|--|
| **Users** | **50** included |
| **Price** | **₹24,999 / mo** · **₹2,49,990 / yr** |
| **Modules** | Full Growth stack + priority support |
| **FMS** | Up to **25** |
| **Storage** | **50 GB** on **object storage** (not Neon BYTEA) |
| **Extra seat** | **₹399 / user / mo** |
| **AI** | Higher fair-use pool (e.g. 1,000 events/org/day) |
| **WA** | Internal alerts; soft cap ~10k sends/mo |

**Example:** 80 users = ₹24,999 + 30×399 = **₹36,969 / mo**

---

### 4) EM Ready Enterprise — from ₹39,999 / month *(100+ users)*

| | |
|--|--|
| **Users** | **100** included (floor for this SKU) |
| **List price** | **₹39,999 / mo** · **₹3,99,990 / yr** |
| **Extra seat (101–250)** | **₹299 / user / mo** |
| **Extra seat (251+)** | **₹249 / user / mo** (quote) |
| **Modules** | All ops modules + SSO path + audit exports |
| **FMS** | Unlimited / high cap (e.g. 100) |
| **Storage** | **100 GB** object storage included |
| **Storage overage** | **₹49 / GB / mo** (object) — *not* BYTEA pricing |
| **Support** | Named CSM / SLA (business hours) |
| **Implementation** | ₹50,000–1,50,000 one-time (scoped) |

**Examples**

| Headcount | Calc | Monthly |
|-----------|------|---------|
| 100 | base | **₹39,999** |
| 150 | 39,999 + 50×299 | **₹54,949** |
| 250 | 39,999 + 150×299 | **₹84,849** |
| 400 | custom (~₹249/seat blended) | **~₹1,00,000+** quote |

**Blended ARPU at 100:** ~₹400/user/mo — competitive vs Zoho/Salesforce mid-market for ops, still above our COGS if on object storage.

---

## Add-ons

| Add-on | Price | Notes |
|--------|-------|--------|
| +10 GB (Starter/Growth, BYTEA era) | ₹1,499 / mo | Avoid pushing past 50 GB on Neon |
| +25 GB | ₹3,499 / mo | |
| Object storage +50 GB (Scale+) | ₹999 / mo | Cheap vs BYTEA |
| Object storage +100 GB | ₹1,799 / mo | |
| Extra FMS template | ₹999 / mo | Below Scale |
| Implementation Starter/Growth | ₹15–25k | |
| Implementation Scale/Enterprise | ₹50k–1.5L | |

---

## Cost analysis (our COGS)

> **Estimates** — no live invoice dump in repo. Assumptions labeled. USD≈₹84.

### Unit cost assumptions

| Driver | Assumption | ₹ / mo |
|--------|------------|--------|
| Neon compute share | Per active org, scales with queries | ₹400 base + ₹8–15 / active user |
| **BYTEA storage** | Neon logical ~$1.5–2.5/GB | **₹125–210 / GB** |
| **Object storage** (S3/R2) | ~$0.015–0.025/GB + egress | **₹2–8 / GB** |
| Vercel / CDN | SSR + assets | ₹3–10 / user |
| OpenAI | gpt-4o-mini + Whisper, fair use | ₹20–60 / user (many seats idle) |
| WA templates (internal) | Meta + platform | ₹15–40 / user |
| Support / ops | Amortized | ₹10–30 / user (higher on Enterprise) |

**Critical:** At 100 users × 100 GB proofs, BYTEA alone ≈ **₹12,500–21,000 / mo**. Object storage ≈ **₹200–800 / mo**. **Do not sell 100+ on BYTEA.**

---

### Scenario A — Current architecture (Postgres BYTEA)

| Org size | Storage | Neon+DB | AI+WA+Vercel | Support | **Total COGS** | List revenue | **Gross margin** |
|----------|---------|---------|--------------|---------|----------------|--------------|------------------|
| **8** (Starter) | 10 GB | 1.0–1.8k | 0.4–1.0k | 0.2k | **₹1.6–3.0k** | ₹4,999 | **40–68%** |
| **20** (Growth) | 25 GB | 2.5–4.5k | 0.8–2.0k | 0.4k | **₹3.7–6.9k** | ₹9,999 | **31–63%** |
| **50** (Scale) | 50 GB | 6–11k | 2–4k | 1k | **₹9–16k** | ₹24,999 | **36–64%** |
| **100** | 100 GB | **14–25k** | 4–8k | 2k | **₹20–35k** | ₹39,999 | **12–50%** *(risky)* |
| **200** | 150 GB | **25–45k** | 8–15k | 4k | **₹37–64k** | ~₹70–85k | **thin / loss risk** |

**Verdict:** BYTEA is OK for Starter/Growth. **Scale/Enterprise need object storage** or margins collapse.

---

### Scenario B — Object storage for Scale / Enterprise (recommended)

| Org size | Storage | Infra (Neon+obj+Vercel) | AI+WA | Support | **Total COGS** | List revenue | **Gross margin** |
|----------|---------|-------------------------|-------|---------|----------------|--------------|------------------|
| **50** | 50 GB obj | 2.5–4.5k | 2–4k | 1k | **₹5.5–9.5k** | ₹24,999 | **62–78%** |
| **100** | 100 GB obj | 4–7k | 4–8k | 2–3k | **₹10–18k** | ₹39,999 | **55–75%** |
| **150** | 120 GB | 5–9k | 6–11k | 3k | **₹14–23k** | ₹54,949 | **58–75%** |
| **250** | 200 GB | 8–14k | 10–18k | 5k | **₹23–37k** | ₹84,849 | **56–73%** |
| **400** | 300 GB | 12–20k | 15–28k | 8k | **₹35–56k** | ~₹1.0–1.2L | **~50–65%** |

**Verdict:** With object storage, **100+ is healthy** at proposed list prices. Target **≥55% gross** after AI fair-use caps.

---

### Per-user COGS vs price (object-storage path)

| Band | Our cost / user / mo | Sell / user (blended) | Notes |
|------|----------------------|------------------------|-------|
| Seats 1–8 | ~₹200–350 | ₹625 (₹4999/8) | Base covers platform |
| Seats 9–20 | ~₹150–250 | ₹499–599 | |
| Seats 21–50 | ~₹120–200 | ₹399–499 | |
| Seats 51–100 | ~₹100–180 | ₹300–400 | Enterprise floor |
| Seats 101–250 | ~₹90–160 | ₹249–299 | Volume |

Keep **sell price ≥ 2× COGS** per band.

---

### What drives cost spikes (watch in demos)

1. **Voice transcription** (Whisper) — heavy users can 3–5× AI line  
2. **HR KYC / FMS proof photos** in BYTEA — storage cliff  
3. **EM / report queries** on large orgs — Neon compute  
4. **WhatsApp fan-out** (every task assign) — Meta + platform  

**Controls:** daily AI org caps, file size limits (already 4–8 MB), storage quotas, object storage for Scale+.

---

## Architecture gate for 100+

| Before selling 50–100+ | Action |
|------------------------|--------|
| Attachments | Migrate FMS/IMS/HR/task files → **S3/R2**; DB keeps metadata only |
| Quotas | `maxStorageGb` + usage meter on org |
| Neon | Separate compute for large tenants or connection pooling |
| AI | Per-plan daily caps; paid AI pack if exceeded |
| Support | Don’t promise Enterprise CSM on Starter margin |

---

## Map to product presets

| Plan | Preset today | Gap |
|------|--------------|-----|
| Starter | `BCI_STARTER` (8, 3 FMS) | Price + storage + Tasks |
| Growth | `BCI_GROWTH` (20, 10 FMS) | Price + storage |
| Scale | *new* | `maxMembers: 50`, object storage |
| Enterprise 100+ | *new* | `maxMembers: 100+`, SSO, SLA |

---

## One-liners

- **Starter:** ₹4,999 for 8 — EM Ready without MIS hire.  
- **Growth:** ₹9,999 for 20 — flows + store + HR.  
- **Scale:** ₹24,999 for 50 — multi-dept mid-market.  
- **Enterprise:** from ₹39,999 for 100+ — ops OS with object storage and volume seats.

---

## After approval

1. Lock this doc + sales kit  
2. Wire `em-ready-plans.ts` → `/pricing` Ops tab  
3. **Prioritize object-storage migration** before Scale/Enterprise sell  
4. Schema: `maxMembers` / `maxStorageGb` / usage  
5. Quote calculator for 100–400 seats  

---

*Estimates for planning — refine with actual Neon/Vercel/OpenAI invoices when available.*
