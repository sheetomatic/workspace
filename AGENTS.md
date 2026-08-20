# Sheetomatic

This workspace is **Sheetomatic only** — sheetomatic.com platform (Workspace, CRM, Templates, WA API, marketing site).

## Do not work on here
- **Anmol Traders** → open `/Users/shyamkumar/Desktop/anmol` (`anmol-traders.sheetomatic.com`)
- **TOPS Security CRM** → open `/Users/shyamkumar/Desktop/tops` (`tops.sheetomatic.com`)
- **Hingorani Law Portal** → open `/Users/shyamkumar/Desktop/hingorani` (`hingorani.sheetomatic.com`)

## Product
- Live: https://sheetomatic.com
- Repo folder: `Desktop/sheetomatic`
- GitHub remote: `sheetomatic/workspace` (legacy remote name; local folder is `sheetomatic`)
- Deploy: `npx vercel deploy --prod --yes` from this folder

## Stack
Next.js, Prisma, Neon, Resend, Vercel

## Agent rules
Call the user team lead; follow agentic engineering (spec → implement → review auth/DB → test → ship).
Do not mix TOPS or Hingorani feature work into this repo unless explicitly asked to change shared platform code that serves those tenants.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
