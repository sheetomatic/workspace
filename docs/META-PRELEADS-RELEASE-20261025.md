# Meta Preleads reporting — 25 October 2026

- Application revision: `ccfd80e6b23dc2dc58efea35f43028873bec8c72`.
- PR: https://github.com/sheetomatic/workspace/pull/81 (preserved-source base, not main).
- Restored baseline: `dpl_49wVGFuRRCCkVaU2AQ3J5MirL1R7`, application `e93a0dd`.
- LIVE: `dpl_9RB64mKZX4tBDFskFm4e77PKeRZi`; both sheetomatic.com and workspace.sheetomatic.com assigned and re-read after READY, source-log verification, Meta-token preflight, schema check and all 19 staged smokes passed.
- Live homepage, pricing and Workspace login returned 200. Live Meta route redirects unauthenticated requests to login (307). Signed-in production UI remains unverified; isolated signed-in UI and deployment-side actual Meta access were verified separately.
- Only reporting and its Preleads link are included. Subscriber and logo work remain separate. No migration, payment activation, messages, ad delivery or budget writes.
- Account pinned to SheetomaticAd `1289822315977891`; last 30 completed days. Server-only bearer authorization, 10-second request timeout, no client token, primary-organization admin guard. Unavailable and no-data states are distinct.
- 551 unit tests passed before the TypeScript-only union narrowing fix; all 3 report tests passed after the fix. Full local 254-page build/typecheck passed after the fix. 281 manifest checksums passed.
- Signed-in isolated-database admin browser checks passed at 1440px and 390px: Preleads navigation, actual read-only Meta metrics, no horizontal overflow or page errors. No real production login was used.
- Candidate environment passed its own Meta Insights access check and read-only database compatibility gate. No secrets printed.
- First candidate `dpl_5pK85o6XAjuTrhow2NDcBAPUGwEw` failed typechecking and was never assigned to either domain. Do not promote it.
- Default Vercel Redeploy previously bypassed the checksum-overlay command despite inherited application metadata. Require build-log source verification and all route smokes; never trust metadata or READY alone.
