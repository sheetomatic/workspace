<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Single Next.js 16 app (marketing + `/app` workspace + `/ai/app`) backed by local PostgreSQL. Dependencies are refreshed automatically by the startup update script (`npm install`, which runs `prisma generate` via `postinstall`). The following are the durable, non-obvious things to know; standard scripts live in `package.json`.

### Start PostgreSQL first (not auto-started)
Postgres 16 is installed and a local `sheetomatic` DB (user `postgres` / password `postgres`) plus a git-ignored `.env` persist in the VM snapshot, but the server does not auto-start on boot. Start it each session before running the app, DB commands, or e2e tests:

```
sudo pg_ctlcluster 16 main start
```

### Fresh/reset DB: use `prisma db push`, not `migrate deploy`
The migration history cannot be replayed on an empty DB: `20260330120000_ims_mvp` sorts before the `20260528120000_init_postgres` baseline that creates the `WorkspaceModule` enum, so `prisma migrate deploy` / `prisma migrate reset` fail with `type "WorkspaceModule" does not exist`. To (re)build a dev DB, sync the schema directly and seed:

```
npx prisma db push        # syncs schema.prisma to the DB (no migration replay)
npm run db:seed           # demo orgs/users; optional: db:seed-bci, db:seed-acme-ims, db:seed-acme-hr
```
The existing seeded DB in the snapshot already has this applied — only re-run if the DB is missing or the schema changed.

### Local host routing — keep the default root domain
`.env` sets `NEXT_PUBLIC_ROOT_DOMAIN=sheetomatic.com` (the default) so plain `http://localhost:3000` serves marketing (`/`), `/login`, and `/app` on one host. Do NOT set it to `localhost`: that makes the middleware treat localhost as the apex marketing host and 307-redirect `/login` and `/app` to `https://workspace.localhost:3000`, which breaks local browser testing.

### Demo logins (password `demo1234` for all)
`owner@acme.demo` (OWNER, Acme Manufacturing) is the main workspace test account; also `manager@`/`staff@`/`viewer@acme.demo`. Super admin: `founder@sheetomatic.com` (password `Kalmi@123#`). Legal portal: `admin@hingorani.demo`.

### Unit tests are timezone-sensitive
`src/lib/leads/google-sheets.test.ts` assumes IST. Run the suite as `TZ=Asia/Kolkata npm run test:unit` for all green; without it that one test fails on the UTC VM (all others pass).

### Lint
`npm run lint` currently reports pre-existing errors/warnings unrelated to environment setup — do not treat a non-zero lint result as a setup failure.
