# Vercel cost playbook (Sheetomatic)

**Goal:** Stay on Vercel this month (and as long as needed) with **lower $ burn**, **no extra latency**, and **no production breakdowns**.

Source of truth for list prices: [vercel.com/pricing](https://vercel.com/pricing) and [Vercel docs — Pricing](https://vercel.com/docs/pricing). Prices change; check the Usage dashboard monthly.

Related long-term host plan: `docs/RAILWAY.md` (Railway Pro single platform — later). Until cutover, follow **this** playbook.

---

## How Vercel bills us (Pro)

| Bucket | What it is | Pro included (typical) | Why Sheetomatic pays |
|--------|------------|------------------------|----------------------|
| **Platform / seats** | Deployers | **$20/mo** + **$20 usage credit**; extra Owner/Member **$20/seat**; Viewers **free** | Team size |
| **Active CPU** | Time functions actually run (Fluid) | On-demand after credit | CRM SSR, server actions, crons, webhooks, Sheets sync |
| **Provisioned Memory** | Memory reserved while Fluid instance is warm | On-demand after credit | Long `maxDuration`, heavy pages |
| **Fast Data Transfer** | CDN egress | **~1 TB/mo** then ~$0.15–0.35/GB | Marketing + assets |
| **Edge Requests** | CDN requests | **~10M/mo** then ~$2–3.20/1M | Page/API hits |
| **Builds** | CI build CPU-minutes | On-demand (~$0.0035/CPU-min) | Every deploy / preview |
| **Image Optimization** | `next/image` transforms + cache | Small free tier; then per 1K / 1M | Transformed images |
| **Add-ons** | SSO, Static IP, Analytics Plus, etc. | **Off by default** — fixed $/mo | Only if you enable them |

Neon / Postgres is **separate** from Vercel (still pay Neon while on Vercel).

---

## North-star rules (do not break these)

1. **Do not** turn off Fluid / cold-start prevention to “save money” — that brings back slow first clicks.
2. **Do not** set Spend Management to **pause production** — use **alerts only**.
3. **Do not** cut WhatsApp / Meta / Telegram webhook `maxDuration` below what delivery needs.
4. **Do not** remove `CRON_SECRET` auth or skip DB tenant filters.
5. **Do** make work finish **faster** and **run less often when idle** — that saves Active CPU without hurting users.

Saving $ = **shorter function time + fewer wasted invocations + no unused add-ons** — not weaker reliability.

---

## Dashboard hygiene (do this once, then monthly)

1. Vercel → **Usage** → Last 30 days → filter project `sheetomatic-redesign` (or current prod name).
2. Note top costs: **Active CPU**, **Provisioned Memory**, **Fast Data Transfer**, **Builds**, **Image Optimization**.
3. **Settings → Billing → Spend Management**
   - Soft alert at e.g. **$50** and **$100**
   - Prefer email/webhook alert — **do not auto-pause** prod
4. Seats: anyone who only views previews → **Viewer** (free), not Member ($20).
5. Add-ons: leave **disabled** unless required:

| Add-on | Approx. | Keep off unless… |
|--------|---------|------------------|
| SAML SSO | $300/mo | Enterprise customer demands it |
| HIPAA BAA | $350/mo | Healthcare contract |
| Static IPs | $100/mo + transfer | Partner requires allowlisted IP |
| Advanced Deployment Protection | $150/mo | Strict preview lock needed |
| Flags Explorer | $250/mo | Heavy Flags usage |
| Preview Deployment Suffix | $100/mo | Custom preview domain brand |
| Web Analytics Plus | $10/mo | Need UTM/custom event depth |
| Speed Insights | $10/mo **per project** | Actively tuning Core Web Vitals |
| Observability Plus | ~$1.20 / 1M events | Debugging prod at scale |

---

## Best practices that save $ **without** latency or outages

### A. Function time (biggest lever for us)

| Practice | Why it saves $ | Latency / reliability |
|----------|----------------|------------------------|
| Keep CRM / server-action work **short**; push Sheets / heavy jobs to `after()` or cron | Less Active CPU per click | Saves stay fast |
| Batch DB reads (avoid N+1 / 100 parallel queries on `/app/leads`) | Less CPU + fewer pool timeouts | **Faster** page, fewer “Connection closed” |
| Use `withDbRetry` on hot paths | Avoids failed requests that users retry (double bill) | **More** reliable |
| Early-exit crons when org has nothing to do | Fewer wasted CPU-minutes | Same SLAs when work exists |
| Sheet sync: resume cursors + time budget (already) | Stays under 300s; no endless burn | Same import completeness over time |
| Region of Fluid functions **near Neon** (same region) | Less wait on DB = less Active CPU; less origin chatter | **Lower** latency |

### B. `maxDuration` (Provisioned Memory)

| Practice | Why it saves $ | Safety |
|----------|----------------|--------|
| Only set high `maxDuration` on routes that need it (`vercel.json` today: webhooks 60s, most crons 60s, `leads-sync` 300s) | Long windows keep memory provisioned longer on Fluid | Do **not** lower `leads-sync` or webhooks below need |
| Do **not** set 300s globally | Would inflate memory bill | — |

### C. Crons (invocation + CPU)

Current schedules live in `vercel.json` (UTC).

| Practice | Why it saves $ | Safety |
|----------|----------------|--------|
| Keep product crons; make handlers **idempotent + early exit** | Idle orgs cheap | Alerts still fire when needed |
| Prefer **one** leads-sync every 15m over also doing full sync on every CRM open when nothing pending | Cuts duplicate CPU | Partial import “continue on open” is OK when cursor incomplete |
| Never add chatty crons (&lt;5 min) without a clear product need | Invocation spam | — |

### D. Builds & previews

| Practice | Why it saves $ | Safety |
|----------|----------------|--------|
| Ignore draft PR builds / `[skip ci]` on docs-only when possible | Fewer build CPU-minutes | Prod deploys unchanged |
| Limit who has **Member** deploy rights | Fewer accidental preview floods + seat $ | Viewers still see deploys |
| Don’t enable expensive build concurrency unless queueing blocks releases | Build $ | Release speed only when needed |

### E. CDN / marketing (usually already cheap)

| Practice | Why it saves $ | Safety |
|----------|----------------|--------|
| Keep marketing mostly static / cacheable | Stays inside **1 TB** Fast Data Transfer + **10M** Edge Requests | CDN = **fast** |
| Avoid huge unoptimized videos on the apex site | Egress | — |
| Prefer static assets under `public/` for logos/icons that don’t need runtime resize | Fewer Image Optimization transforms | Same perceived quality if sized correctly |

### F. Image Optimization

| Practice | Why it saves $ | Safety |
|----------|----------------|--------|
| Use `next/image` where responsive sizing matters (product UI) | Good UX | Keep where it helps |
| Don’t run every CMS/decorative URL through transforms “just because” | Transform + cache write $ | Use correctly sized static files |

### G. Analytics & logs

| Practice | Why it saves $ | Safety |
|----------|----------------|--------|
| Default Web Analytics is enough for now | Avoid Analytics Plus / Speed Insights until actively used | Prod unaffected |
| Don’t enable Observability Plus “for fun” | Event $ | Use when debugging incidents |

### H. Database (Neon — not Vercel, but drives Vercel $)

| Practice | Why it saves $ | Safety |
|----------|----------------|--------|
| Always use **pooler** URL in `DATABASE_URL` on Vercel | Fewer connection failures → fewer retries/timeouts | Required for serverless |
| Avoid DB sleep / tiny compute that causes “Connection closed” | Failed CRM loads → user spam retries → more Function $ | Warm enough compute for prod |
| Keep `DATABASE_CONNECTION_LIMIT` modest (see `.env.example` / `src/lib/db.ts`) | Fits serverless; avoids pool chaos | Pair with batched queries |

---

## Sheetomatic hotspots (watch these first)

1. **`/app/leads` CRM load** — large `Promise.all` + per-lead sales-order lookups → Active CPU + connection errors.  
2. **`/api/cron/leads-sync` every 15m** (+ up to 300s) — largest scheduled CPU consumer.  
3. **CRM `after()` Sheets auto-sync** — useful, but must skip when idle / already fresh.  
4. **WhatsApp webhooks** — must stay reliable; optimize handler speed, not remove.  
5. **Preview deploy volume** — quiet cost if many Members push branches.

---

## What NOT to do to “save money”

| Anti-pattern | Why it’s bad |
|--------------|--------------|
| Downgrade commercial prod to Hobby | Against Vercel ToS / limits; outages |
| Pause project on spend cap | Customer-facing outage |
| Disable Fluid / cold-start prevention | Returns slow empty-CRM pain |
| Slash cron `maxDuration` so jobs die mid-run | Missed alerts, partial Sheet imports, support load |
| Delete cron jobs that feed EM / FMS / tasks | Product regression |
| Move secrets or skip auth checks | Security incident ≫ hosting $ |

---

## Monthly checklist (15 minutes)

- [ ] Usage: which metric grew? (CPU vs transfer vs builds)  
- [ ] Any new Pro add-ons accidentally enabled?  
- [ ] Seat list: deployers vs free Viewers  
- [ ] Failed function ratio (timeouts/errors) — fix causes, don’t ignore (failures cost retries)  
- [ ] Neon: compute awake; pooler URL; no connection storm  
- [ ] Still planning Railway cutover? Keep `docs/RAILWAY.md` ready; no dual-traffic  

---

## Agent / engineering memory

Cursor rule: `.cursor/rules/vercel-cost.mdc`  

When changing hosting, crons, CRM load, or Image usage, agents must follow that rule so cost work never trades away latency or uptime.
