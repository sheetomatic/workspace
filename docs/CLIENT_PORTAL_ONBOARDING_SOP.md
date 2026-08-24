# Client portal onboarding SOP

We sell dedicated portals. If go-live is improvised, the next client fails the same way Anmol did. Follow this in order. **Do not deploy until preflight exits 0.**

There are two different products. Do not mix the runbooks.

| Kind | Host | Where it runs | Runbook |
|---|---|---|---|
| SaaS workspace tenant | `{slug}.sheetomatic.com` on the **Sheetomatic** project | `sheetomatic-redesign` | `docs/CLIENT_ONBOARDING_READINESS.md` |
| Dedicated portal (sold as own app) | `{slug}.sheetomatic.com` on a **separate** Vercel project | Own repo (Anmol / Hingorani / Tops) | **This file** |

This SOP is for dedicated portals only.

---

## Never again (Anmol 2026-08-22)

| Failure | Rule |
|---|---|
| Domain still pointed at `sheetomatic-redesign` | Dedicated host must be attached to the **client** Vercel project, not the platform wildcard |
| Build Error: `providerKind === "messageautosender"` | Official-only portals: no MAS type-narrowing. Typecheck in the **client repo** before deploy |
| Blocked: `…MacBook-Air.local` author | Deploy with `GIT_AUTHOR_EMAIL=training@sheetomatic.in` for that command only. Never `git config` |
| Missing `OPENAI_API_KEY` | Copy from `.env.shared.local`. If that file is empty, **stop**. Do not hunt Hingorani or invent a key |
| Vercel CLI pull = stub / empty | Sensitive values are not decryptable. The laptop vault is the source of truth |
| Dual-root Cursor window | Open the **client repo alone**. Dual-root mixes commits |

---

## Secrets vault (do this once, keep it current)

Vercel Production holds the live Sheetomatic key, but the API/CLI cannot read it.

1. Create `/Users/shyamkumar/Desktop/sheetomatic/.env.shared.local` from `.env.shared.example`.
2. Paste shared keys from the Vercel **dashboard** (not CLI pull) the first time, or after a key rotation.
3. Required non-empty names: `OPENAI_API_KEY`, `DATABASE_URL`, `DIRECT_URL`.
4. Optional if the sale includes email / cron: `RESEND_API_KEY`, `CRON_SECRET`.
5. **Do not** put `AUTH_SECRET` here — each portal gets its own.
6. After any rotation, update the vault the same day.

If the vault is empty, onboarding **stops**. Ask the lead to paste into the vault (or Vercel UI). Do not guess.

---

## Phase 0 — Sale locked

Confirm with the lead before any repo/Vercel work:

- [ ] Client legal name + portal **slug** (host = `{slug}.sheetomatic.com`)
- [ ] Kind: `tasks` / `legal` / other
- [ ] Modules sold (do not enable extras)
- [ ] WhatsApp in scope? Official API only unless they named Web Based
- [ ] They **named** this deploy target (Anmol / Hingorani / Tops / new name)

If they did not name the target, deploy Sheetomatic only.

---

## Phase 1 — Repo and identity

- [ ] New folder: `/Users/shyamkumar/Desktop/{slug}` (own git repo, own Cursor window)
- [ ] Register in Workspace `src/lib/dedicated-client-portals.ts` (slug, aliases, modules, homePath)
- [ ] `NEXT_PUBLIC_STANDALONE_ORGANIZATION_SLUG={slug}`
- [ ] Production URLs: `AUTH_URL` / `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL` = `https://{slug}.sheetomatic.com`
- [ ] Do **not** set `AUTH_COOKIE_DOMAIN` on a standalone portal (host-only cookie)
- [ ] `AUTH_SECRET` unique to this portal (`openssl rand -base64 32`)
- [ ] Official-only: `WHATSAPP_PROVIDER=sheetomatic`; remove MAS-only type branches so `npm run build` passes

---

## Phase 2 — Vercel project

- [ ] Create project `{slug}` on team `sheetomatic` (Next.js, `npm run build`)
- [ ] `vercel link` from the **client** folder only
- [ ] Do not hook this project to the Workspace GitHub repo

---

## Phase 3 — Environment

From the vault (shared):

- [ ] `OPENAI_API_KEY`
- [ ] `DATABASE_URL` / `DIRECT_URL` (same Neon as Workspace unless the sale says otherwise)

Client-specific (generate or set, do not copy Sheetomatic blindly):

- [ ] `AUTH_SECRET`
- [ ] `AUTH_URL` / `NEXTAUTH_URL`
- [ ] `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_ROOT_DOMAIN` / `NEXT_PUBLIC_STANDALONE_ORGANIZATION_SLUG`

If WhatsApp is in the sale (paste from wa.sheetomatic.com / lead — CLI cannot decrypt):

- [ ] `WHATSAPP_PROVIDER=sheetomatic`
- [ ] `REDLAVA_API_KEY` / `REDLAVA_API_BASE_URL` / `REDLAVA_PHONE_ID`
- [ ] `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

Add with stdin, never `--value` on the command line:

```bash
npx vercel env add OPENAI_API_KEY production --sensitive --yes < /path/to/value.file
```

---

## Phase 4 — Domain

- [ ] Attach `{slug}.sheetomatic.com` to the **client** project
- [ ] Remove that host from `sheetomatic-redesign` if it was a wildcard alias
- [ ] Confirm response header / tenant slug is the client, not the platform marketing site

---

## Phase 5 — Preflight (hard gate)

From Workspace:

```bash
node scripts/client-portal-preflight.mjs --project {slug} --slug {slug}
```

Exit 0 required. Missing names only — never print secrets.

Then in the **client** repo:

```bash
npm run build
```

---

## Phase 6 — Deploy

```bash
cd /Users/shyamkumar/Desktop/{slug}
GIT_AUTHOR_NAME="Sheetomatic Training"
GIT_AUTHOR_EMAIL="training@sheetomatic.in"
GIT_COMMITTER_NAME="Sheetomatic Training"
GIT_COMMITTER_EMAIL="training@sheetomatic.in"
npx vercel deploy --prod --yes
```

Never `git config`. Never `--force` to main.

---

## Phase 7 — Accept (or it is not sold)

- [ ] `https://{slug}.sheetomatic.com/login` loads; tenant is `{slug}`
- [ ] Owner can sign in; staff see only this org
- [ ] Settings shows OpenAI **Configured** (not Missing `OPENAI_API_KEY`)
- [ ] One AI action works (task parse or assistant)
- [ ] If WhatsApp sold: paste the **current** Go Live callback on wa.sheetomatic.com, then inbound **Hi**
- [ ] Tell the lead the live URL + what they must paste (webhook). Do not print tokens

---

## New client (copy this row)

| Field | Value |
|---|---|
| Name | |
| Slug | |
| Repo path | `/Users/shyamkumar/Desktop/` |
| Vercel project | |
| Kind / modules | |
| WhatsApp | Yes Official / No |
| Vault keys copied | |
| Preflight | |
| Production URL | `https://{slug}.sheetomatic.com` |
| Accepted by lead | |
