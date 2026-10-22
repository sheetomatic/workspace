# Production forward baseline (locked 2026-10-22)

Sheetomatic production (`sheetomatic-redesign`) is **forward-only** from this baseline.

| Field | Value |
|-------|--------|
| Locked from | 22 October 2026 |
| Baseline SHA | `a0f295e92951871395f8d1d4fc02ea3d12e6ff0a` |
| Message | `fix(marketing): ship SolutionPreview dependency for FMS restore build` |
| Must include | FMS dual videos on `/services/flow`, Field Executive Management Systems at `/services/field-tracking` |

## Rules

1. Every production deploy SHA **must be a descendant** of the baseline (or the baseline itself).
2. **Never** Instant Rollback / promote / alias to a deploy whose commit is **not** a descendant of the baseline.
3. **Never** attach customer domains to `sheetomatic-redesign-deploy-v2`.
4. After Ready, run `npm run deploy:verify` — ship is not done until it exits 0.

Update the baseline SHA only when the team lead explicitly advances the lock (newer tip that has already passed smoke).
