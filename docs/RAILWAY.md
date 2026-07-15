# Sheetomatic on Railway Pro (single platform)

**Decision:** Host everything on **Railway Pro** — web app, Postgres, and cron jobs.  
Do not split across Vercel + Neon + VPS for production.

## Architecture

| Piece | Railway service |
|-------|-----------------|
| Next.js app | **web** (this repo, Docker) |
| Database | **Postgres** plugin |
| Crons (replace `vercel.json`) | Small **cron-*** services, same image, `RAILWAY_CRON_JOB=…` |

```
Internet → Railway web (always-on) → Railway Postgres
                ↑
         cron services (HTTP + CRON_SECRET, then exit)
```

## One-time setup (Railway dashboard)

1. Create a **Pro** workspace at [railway.com](https://railway.com).
2. **New Project** → **Deploy from GitHub** → `sheetomatic/workspace` (branch `main`).
3. Add **Postgres** (+ New → Database → PostgreSQL).
4. On the **web** service → **Variables**:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `DIRECT_URL` = `${{Postgres.DATABASE_URL}}` (same URL is fine on Railway Postgres)
   - Copy all production secrets from Vercel (see checklist below)
5. **Settings → Networking** → Generate domain, then add custom domains:
   - `sheetomatic.com`, `www`, `app`, `ai`, and tenant hosts as needed
6. Confirm health: `https://<your-domain>/api/health` → `{ "ok": true }`

`railway.toml` already points at the Dockerfile and `/api/health`.

## Required environment variables (web)

Copy from Vercel Production, then adjust:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DIRECT_URL=${{Postgres.DATABASE_URL}}

AUTH_SECRET=<same or new>
CRON_SECRET=<same or new>
NEXTAUTH_URL=https://sheetomatic.com
NEXT_PUBLIC_SITE_URL=https://sheetomatic.com
NEXT_PUBLIC_ROOT_DOMAIN=sheetomatic.com
AUTH_COOKIE_DOMAIN=.sheetomatic.com
AUTH_TRUST_HOST=true

# Used by cron services:
APP_BASE_URL=https://sheetomatic.com

# Plus: OpenAI, Resend, WhatsApp/RedLava, Google Sheets, etc.
```

## Migrate data from Neon → Railway Postgres

```bash
# Laptop (Neon URL):
pg_dump "$NEON_DATABASE_URL" --no-owner --format=custom -f sheetomatic.dump

# Railway Postgres: use the public TCP URL from the Postgres service
pg_restore --no-owner -d "$RAILWAY_DATABASE_URL" sheetomatic.dump
```

Or use Railway’s Postgres UI / `railway connect Postgres` if you prefer.

## Cron services (replace Vercel cron)

Railway cron minimum interval is **5 minutes** (your leads-sync every 15m is fine).  
Schedules are **UTC**.

For each job: **+ New** → **GitHub Repo** (same repo) → set:

| Service name | Cron schedule (UTC) | Variable `RAILWAY_CRON_JOB` |
|--------------|---------------------|----------------------------|
| cron-leads-sync | `*/15 * * * *` | `leads-sync` |
| cron-task-reminders-a | `0 9 * * *` | `task-reminders` |
| cron-task-reminders-b | `0 4 * * *` | `task-reminders` |
| cron-due-date-alerts | `30 4 * * *` | `due-date-alerts` |
| cron-fms-a | `0 5 * * *` | `fms-step-reminders` |
| cron-fms-b | `0 10 * * *` | `fms-step-reminders` |
| cron-ims-reorder | `0 6 * * *` | `ims-reorder-alerts` |
| cron-checklist-pc | `0 7 * * *` | `checklist-pc` |
| cron-task-due-digest | `30 3 * * *` | `task-due-digest` |

On every cron service, also set:

```env
APP_BASE_URL=https://sheetomatic.com
CRON_SECRET=<same as web>
```

No public domain needed on cron services.  
Entrypoint sees `RAILWAY_CRON_JOB`, calls `/api/cron/<job>`, then **exits** (required by Railway cron).

Manual test:

```bash
APP_BASE_URL=https://sheetomatic.com CRON_SECRET=... \
  node scripts/railway-cron.mjs leads-sync
```

## DNS cutover

1. Smoke-test login, CRM save, FMS, WhatsApp webhook on the Railway domain  
2. Lower DNS TTL  
3. Point `sheetomatic.com` / `app` / `ai` / tenants to Railway (or Cloudflare → Railway)  
4. Update Meta/WhatsApp/Telegram webhook URLs if the origin changes  
5. **Pause or remove Vercel production** so traffic is not split  
6. Keep Vercel paused ~1–2 weeks for emergency rollback only  

## Deploys after cutover

Push to `main` (or your production branch). Railway rebuilds the Docker image and runs migrations in the web entrypoint.

## Sizing (Railway Pro)

| Stage | Web | Postgres |
|-------|-----|----------|
| ~1,000 logins | 1–2 vCPU, 2–4 GB RAM | Starter → 1–2 GB |
| Growing tenants | 2–4 vCPU, 4–8 GB | Scale RAM; add indexes |
| Toward 1,000+ tenants | Split **worker** later; keep Postgres growing | Pooling + backups |

Set a **monthly spend limit** on the Railway project.

## What stays in the repo

- `vercel.json` — ignored once Vercel is off (kept for rollback docs only)  
- `Dockerfile` + `railway.toml` — production path  
- `scripts/railway-cron.mjs` — cron HTTP caller  

## Rollback

1. Point DNS back to Vercel  
2. Point `DATABASE_URL` on Vercel at Neon (if you left Neon running)  
3. Re-enable the Vercel project  
