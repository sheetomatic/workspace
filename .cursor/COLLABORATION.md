# Active handover

Codex owns Website + Workspace integration and production release until the team
lead explicitly changes the owner.

Cursor may:

- implement scoped work on a feature branch;
- run tests and create previews;
- send the resulting commit SHA and verification evidence to Codex.

Cursor must not:

- push directly to `main`;
- deploy or promote production;
- change `sheetomatic.com` or `workspace.sheetomatic.com` aliases;
- change Vercel production settings;
- remove or bypass preserved release overlays.

Current protected live deployment: `dpl_BkXikNDc54f64ZJLBTqvU3SLFXXe`.
