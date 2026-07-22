# Host Sheetomatic on Hostinger VPS (leave Vercel)

This repo now supports Docker production hosting. Vercel can keep running until DNS cutover.

## What changes

| On Vercel today | On Hostinger VPS |
|-----------------|------------------|
| `vercel.json` crons | Host `crontab` → `scripts/vps-cron.sh` |
| Serverless Node | Docker `app` container (`next start` / standalone) |
| Neon (or Vercel Postgres) | Postgres in Docker **or** keep Neon URL in `.env` |
| Vercel env UI | `/opt/sheetomatic/.env` |
| Automatic git deploy | `./deploy/hostinger/deploy.sh` (or CI → SSH) |

## VPS size (minimum)

- **4 GB RAM / 2 vCPU** recommended (Next build needs memory; runtime is lighter)
- **40 GB+** SSD
- Ubuntu 22.04 or 24.04
- Open ports **22, 80, 443**

## One-time server setup

```bash
# 1) Docker
sudo apt update && sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# re-login

# 2) App directory
sudo mkdir -p /opt/sheetomatic /var/log
sudo chown $USER:$USER /opt/sheetomatic
cd /opt/sheetomatic
git clone https://github.com/sheetomatic/workspace.git .
# or: git clone <your-fork-url> .
```

## Configure environment

```bash
cp .env.example .env
nano .env
```

**Required for VPS:**

```env
POSTGRES_USER=sheetomatic
POSTGRES_PASSWORD=use-a-long-random-password
POSTGRES_DB=sheetomatic

# App container talks to the compose service name `postgres`
DATABASE_URL="postgresql://sheetomatic:use-a-long-random-password@postgres:5432/sheetomatic?schema=public"
DIRECT_URL="postgresql://sheetomatic:use-a-long-random-password@postgres:5432/sheetomatic?schema=public"

AUTH_SECRET="openssl rand -base64 32"
CRON_SECRET="openssl rand -base64 32"
NEXTAUTH_URL="https://sheetomatic.com"
NEXT_PUBLIC_SITE_URL="https://sheetomatic.com"
NEXT_PUBLIC_ROOT_DOMAIN="sheetomatic.com"
AUTH_COOKIE_DOMAIN=".sheetomatic.com"
AUTH_TRUST_HOST=true

# Copy the rest from Vercel Production env (OpenAI, WhatsApp, Resend, Google Sheets, etc.)
```

**Optional:** Keep using Neon — set `DATABASE_URL` / `DIRECT_URL` to Neon and you can comment out the `postgres` service later. For a first cutover, local Docker Postgres + `pg_dump` from Neon is simplest.

### Migrate data from Neon → VPS Postgres

```bash
# On your laptop (with Neon URL):
pg_dump "$NEON_DATABASE_URL" --no-owner --format=custom -f sheetomatic.dump

# Copy dump to VPS, then:
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U sheetomatic -d sheetomatic --no-owner < sheetomatic.dump
```

## Build & run the app

```bash
cd /opt/sheetomatic
chmod +x deploy/hostinger/deploy.sh deploy/hostinger/entrypoint.sh scripts/vps-cron.sh
./deploy/hostinger/deploy.sh
curl -sS http://127.0.0.1:3000/api/health
```

## Nginx + HTTPS

```bash
sudo cp deploy/hostinger/nginx-sheetomatic.conf /etc/nginx/sites-available/sheetomatic
sudo ln -sf /etc/nginx/sites-available/sheetomatic /etc/nginx/sites-enabled/sheetomatic
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Point DNS A records to the VPS IP first, then:
sudo certbot --nginx \
  -d sheetomatic.com \
  -d www.sheetomatic.com \
  -d app.sheetomatic.com \
  -d ai.sheetomatic.com
```

Wildcard `*.sheetomatic.com` needs a DNS challenge (Cloudflare API token) — Certbot nginx plugin alone cannot issue wildcards. Tenant subdomains either:

1. Use a Cloudflare proxy + Certbot DNS plugin, or  
2. Add each tenant host manually, or  
3. Terminate TLS at Cloudflare (Flexible/Full) and proxy to the VPS.

## Cron (replaces Vercel cron)

```bash
sudo cp scripts/vps-cron.sh /opt/sheetomatic/scripts/vps-cron.sh
sudo chmod +x /opt/sheetomatic/scripts/vps-cron.sh
sudo touch /var/log/sheetomatic-cron.log
sudo crontab -e
# paste from deploy/hostinger/crontab.example
# ensure CRON_SECRET is in /opt/sheetomatic/.env
```

Test one job:

```bash
SHEETOMATIC_ENV_FILE=/opt/sheetomatic/.env APP_BASE_URL=https://sheetomatic.com \
  /opt/sheetomatic/scripts/vps-cron.sh leads-sync
```

## DNS cutover checklist

1. VPS app healthy at `https://<VPS-IP>` (hosts file test) or temporary subdomain  
2. Crons firing (check `/var/log/sheetomatic-cron.log`)  
3. Login, CRM, FMS smoke test  
4. Lower DNS TTL ahead of time  
5. Point `sheetomatic.com` / `app` / `ai` / tenant records to VPS IP  
6. Confirm webhooks (WhatsApp / Meta / Telegram) still hit the new origin  
7. **Disable Vercel production** (pause project or remove domains) so traffic is not split  
8. Keep Vercel as rollback for 1–2 weeks if needed  

## Updates after cutover

```bash
cd /opt/sheetomatic
./deploy/hostinger/deploy.sh
```

## Rollback to Vercel

1. Point DNS back to Vercel  
2. Ensure Vercel env + Neon still current  
3. Re-enable Vercel project  

## Notes

- `vercel.json` stays in the repo for optional Vercel use; it is **ignored** on the VPS.  
- Docker builds set `DOCKER_BUILD=1` so `next.config.ts` enables `output: "standalone"`. Vercel builds leave it unset.  
- Do not expose Postgres port publicly; only `127.0.0.1:3000` is published.  
- Set strong `POSTGRES_PASSWORD`, `AUTH_SECRET`, and `CRON_SECRET`.  
