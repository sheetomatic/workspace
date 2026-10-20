# Sheetomatic first-callback agent

## Scope and behaviour

- Website WhatsApp links/display now use **+91 96857 88980**. Voice calls and payment/UPI details are unchanged.
- Only the explicitly configured Sheetomatic primary workspace is eligible. Other tenants are untouched.
- New WhatsApp/API/Facebook/Instagram sales enquiries get Sumit Chandra as assignee, a HIGH priority Sales task, a CRM follow-up and an audit activity in one transaction.
- Existing assignments, historical captures, passive imports, archived/merged leads, completed calls and closed sales are not reassigned. Rule-inferred sales stages (e.g. FMS → SCHEDULE_MEETING) still qualify for a first callback.
- Working hours: Monday–Saturday 09:00–19:00 Asia/Kolkata. Sunday closed. Deadline: receipt +15 minutes when the full window fits. Before opening, after 18:45, and Sundays: next working day 09:15. Exactly 18:45 is due 19:00.
- The owner and Sumit receive duplicate-safe in-app overdue alerts during working hours. One-minute cron resolution, queue load and outages can delay detection; the callback task deadline remains exact. These are **not** automated telephone calls.
- Assignment acknowledgement names Sumit and the exact callback date/time. It is sent only after the task/assignment commit, from the configured official sender, during a verified inbound WhatsApp session. Existing MAS welcome is suppressed for agent-managed intake.
- **No active WhatsApp session:** a pending reason appears in CRM. Do not send free-form outbound messages. Verified opt-in plus an approved assignment template must be added before supporting acknowledgements to website/Meta leads who have never messaged the number, or after 24 hours. This release does not invent consent or a template.
- Provider `accepted` is not a delivery receipt. Failed/unknown/sending claims remain in the lead activity for operator reconciliation. At-most-once external attempts prevent duplicate messages after ambiguous timeouts; they are not an exactly-once delivery guarantee.
- All task/follow-up/message-claim/notification IDs are deterministic and tenant-scoped. Existing tables are reused; **no schema migration**.

## Activation (not performed)

Feature is **disabled by default**. No live CRM records/messages or production settings were changed during implementation.

After a scoped deployment, an authenticated OWNER/ADMIN of the primary workspace can read `/api/leads/callback-agent/status`. It returns candidate CRM IDs, sender match, credential presence and cron heartbeat, not tokens/customer records. Credential presence is not provider verification.

Verify Sumit's active membership and the intended escalation owner, then configure these non-secret values on the verified deployment:

```text
CRM_CALLBACK_ORGANIZATION_ID=<verified Sheetomatic primary organization ID>
CRM_CALLBACK_ASSIGNEE_ID=<verified Sumit Chandra user ID>
CRM_CALLBACK_OWNER_ID=<verified owner/admin user ID>
CRM_CALLBACK_ENABLED_SINCE=<activation instant in ISO 8601 UTC>
CRM_CALLBACK_ENABLED=true
```

Reuse the existing securely configured `CRON_SECRET` and workspace official WhatsApp credentials. Do not paste tokens into chat or client code. `/api/cron/crm-callbacks` requires the cron secret even in development. To pause all automation, set `CRM_CALLBACK_ENABLED=false`; existing tasks remain for the team.

Check the authenticated readiness response, confirm the official API sender via the CRM/provider account, and exercise one explicitly authorized test enquiry. Inspect task, follow-up, message provider receipt and the one-minute heartbeat before considering the rollout complete. No customer-facing tests were sent here.

## Deployment constraints

Verified Vercel project: `sheetomatic-redesign` (`prj_E2G99Y1UGVVQ7SXqmJQfVKjzy2yt`), Sheetomatic team `team_3GV54WqCCioFnx8Bk9We6lKi`.

Observed production: `dpl_9agEkCTH1dEXa52m1yuGVeN5UAvf`. Live source differs from this checkout in `src/app/site-content.ts` and `src/app/contact/page.tsx`; live build also reconstructs earlier Courses/pricing/template patches. **Do not deploy this whole branch over production.** Preserve that chain and apply only the reviewed callback/number delta, including the one-minute cron. The earlier unpublished Template checkout commit must not be deployed or pushed incidentally.

The configured Meta Ads credential returned Graph error 100 when reading the previously referenced WhatsApp phone ID; this does not prove the saved CRM RedLava/Meta connection is broken. Live organization/member IDs and sender authorization remain unverified in this execution environment. Do not enable based on names alone.

## Verification

Use the existing dependency installation. No new packages or environment setup changes are required.

```sh
npx vitest run src/lib/leads/callback-policy.test.ts src/app/api/leads/callback-agent/status/route.test.ts
DATABASE_URL=postgresql://postgres@127.0.0.1:55439/template_checkout_test npx vitest run src/lib/leads/callback-agent.integration.test.ts
```

The integration suite is guarded to that exact isolated local fixture database and mocks WhatsApp/nurture sends. It creates and removes only its own organization/user fixtures. Covers concurrent assignment, atomic task/follow-up creation, cross-tenant exclusion, inactive/wrong member, historical/bulk/closed leads, acknowledgements only after assignment, duplicate sends, sender/session checks, ambiguous provider failure, reassignment/completion, Sunday/escalation deduplication, cron authentication, and the actual FMS intake/retry path.

Final check: **56 tests across six files passed**, including existing pricing/nurture regression tests, 13 policy tests, 11 PostgreSQL workflow tests and four readiness authorization tests. Scoped TypeScript and ESLint checks pass. Full-repository TypeScript still reports seven pre-existing errors in unrelated billing, Fleet, sheet-sync and activation tests. Local HTTP checks return 503 without the cron secret and 401 without a CRM login. No full production build, real-provider delivery test or live activation has been claimed.
