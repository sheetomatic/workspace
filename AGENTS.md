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
- Production project: `sheetomatic-redesign`
- **Do not** run `vercel --prod`, `vercel promote`, reassign production aliases,
  or rely on Vercel's automatic `main` deployment. The live application contains
  preserved Workspace, Tasks checkout, Templates, Courses, pricing, and Calendar
  overlays that are not represented by a plain checkout of `main`.
- Build and inspect a preview first. Production release must start from the
  currently verified live deployment, apply checksum-gated overlays, run the
  production smoke suite, and only then atomically assign both
  `sheetomatic.com` and `workspace.sheetomatic.com`.
- The known-good preserved deployment on 22 Oct 2026 is
  `dpl_BkXikNDc54f64ZJLBTqvU3SLFXXe`. Never replace it with a plain Git build.

## Stack
Next.js, Prisma, Neon, Resend, Vercel

## Agent rules
Call the user team lead; follow agentic engineering (spec → implement → review auth/DB → test → ship).
Do not mix TOPS or Hingorani feature work into this repo unless explicitly asked to change shared platform code that serves those tenants.
Before any production action, verify the current aliases and preserved release
metadata. If another agent is working, coordinate ownership; one agent deploys,
the others stop at tested commits/previews. A Git push is not production approval.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
