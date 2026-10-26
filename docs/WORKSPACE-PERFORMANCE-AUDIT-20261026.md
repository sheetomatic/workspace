# Workspace performance: initial read-only audit, 26 October 2026

This is a partial source/HTTP audit, not proof that authenticated Workspace performance is fixed. No production user data or settings were changed.

## Measurements from the cloud execution environment

Two sequential GETs per route, redirects disabled, no authenticated browser session:

| Route | HTTP | Elapsed milliseconds |
| --- | --- | --- |
| /login | 200 | 1473, 263 |
| /app | 307 | 294, 330 |
| /app/leads | 307 | 328, 384 |
| /app/hr | 307 | 314, 118 |
| /app/tasks | 307 | 145, 115 |
| /app/leads/preleads/meta | 307 | 287, 276 |

These include cloud network/proxy overhead. Protected-route timings measure only login redirects, not database queries or the user's actual signed-in experience. They are not p95 benchmarks. No production-session cookies were extracted or fabricated.

## Confirmed source findings, not yet measured root causes

1. `src/app/app/leads/(crm)/page.tsx` awaits `ensureLeadConnections` (with DB retries) before rendering/searching. Connection initialization is on the request's critical path even though errors are caught. Maintenance and Google Sheets sync are correctly in `after`, not awaited before the page response.
2. Shared session resolution (`src/lib/auth.ts`) contains several sequential membership/user/organization reads and trial checks. `getSessionUser` and organization/member shell reads already use React request caching; avoid global cross-user caches that weaken tenant isolation.
3. `WorkspaceResolvedShell` runs organization-list, preferences, HR settings, license and hierarchy reads in parallel. A failure in any one currently redirects to login. This can appear as a broken Workspace even when authentication is valid. Any fallback needs to remain fail-closed for permissions; do not simply suppress access errors.
4. Homepage reads membership preferences and organization details again instead of reusing existing request-scoped shell helpers. Widget loading fans out across enabled modules; the IMS widget loads stock rows to compute counts. Measure database query time/cardinality before adding indexes or caching.
5. Meta summary and daily Insights calls are sequential, with a 10-second timeout each. The ad-level call runs in parallel with the combined report. The report page waits for all results; slow Meta API responses can delay this route independently of the rest of Workspace. Summary and daily requests could be parallelized while preserving partial-summary rendering.
6. HR navigation is already read-only (`getHrSettings` is cached `findUnique`), not an upsert on every switch. Do not claim that old issue still exists.

## Next evidence needed

- Identify the slowest pages and approximate duration from the user; request was sent asynchronously.
- Profile signed-in module switches using an existing authorized browser session or a sanitized network/performance capture. Do not ask for passwords/cookies or share an unredacted HAR containing personal data/tokens.
- Add bounded query/route instrumentation in an isolated or reviewed preview, without logging personal information. Compare repeated and cold requests and validate tenant isolation after any optimization.
- Keep performance changes separate from the payment-activation migration/release. No entire-Workspace speed improvement is claimed yet.
