# Calendar bookings and public contact update — local verification

Date: 20 October 2026. Branch: `codex/calendar-bookings-brand-contact`.
Base: `c0136378d65fc4961b74d39d9cc9873adf14d90f` (unpublished callback work), with unpublished Template checkout ancestor `e26fc727a6f0d5d2d9be8c2053915b256e0a1e92` preserved.
The final implementation commit is reported in the task handoff / `git log -1`.

## Scope and safety

- Local implementation and verification only. No push, deployment, production migration, real payment, customer message, Calendar mutation or expanded OAuth access.
- Additive migration `20261020050000_google_calendar_bookings` creates two new mirror/sync-state tables. Applied only to the isolated local PostgreSQL fixture database on `127.0.0.1:55439/template_checkout_test`.
- Google events are a separate read-only source in CRM > Meetings. They do not become phone-required leads or CRM follow-ups, and cannot trigger callback/reminder automations. The normal CRM lead/reminder controls remain on manually recorded meetings.
- Counts are IST-based. Cancelled bookings are available in a separate view and excluded from active counts. A past scheduled booking does not imply attendance/completion. The existing recent-history window is 90 days.
- Deduplication is by workspace + calendar + Google event ID, not by guest name or time. A separately entered manual CRM meeting is not automatically merged with a Google booking.

## Verification results

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Booking → CRM meeting list, dashboard counts and nav badge | PASSED locally | Real PostgreSQL integration calls `listCrmMeetings`, `getCrmMeetingsStats`, and `getCrmModuleNavCounts`; one imported booking produces one meeting. No lead, follow-up or WhatsApp message created. Google responses are fixtures. |
| Duplicate sync | PASSED locally | Repeating the same event leaves one record and one active count; sync lease rejects a concurrent worker. |
| Reschedule | PASSED locally | Same event ID updates in place. Cancel-old/rebook-new leaves one active booking and one cancelled record. |
| Cancellation | PASSED locally | Minimal `id/status` tombstones work; older timestamp updates cannot undo a newer cancellation; cancelled view/count excludes active totals. All external attendees declining also cancels. |
| Time zones | PASSED locally | RFC3339 offsets, IST midnight/day change and New York summer/winter offsets tested. Offsetless/all-day data excluded. |
| Pagination and recovery | PASSED locally | Expired sync token (410) resets full sync. Missing bookings are cancelled only after a complete successful full scan, never after an interrupted page. Cursor/data transaction, 403 cache retention and workspace/calendar isolation tested. |
| Google meeting row rendering | PASSED locally | Three React server-render tests: Google links, no CRM lead/reminder controls for imports, cancelled filtering, existing manual actions retained. |
| Public contact source audit | PASSED with documented exclusions | `public-contact.test.ts` scans all supported text source/public assets. Public WhatsApp/call configuration and quotation contact use +91 97557 33107. Official API sender remains +91 96857 88980. |
| Public browser link audit | PASSED locally | Chromium visits 38 routes, including all sitemap marketing pages, nine service categories, three HR detail pages, terms and login. HTTP 200; every rendered sales WhatsApp/call link targets +919755733107; no obsolete public contact text. Desktop and 390px contact screenshots captured. All non-local requests blocked; no form submissions or contact-link clicks. |
| Template/callback preservation | PASSED locally | 22 existing Template checkout/email/commerce tests and 28 callback policy/workflow/auth tests pass. No unrelated Template implementation changed. |
| New icon pixels / favicon / Apple shortcut / manifest rendering | UNRUN — BLOCKED | Requested exact asset is Library ID `libfile_cf4200b6f52c8191953310767229a0b4`. No supported Library materialization tool is exposed and `/workspace/library-files` is empty. No substitute or existing unrelated icon used. Icon files, metadata and manifest remain unchanged. Attach exact `icon.png` or materialize it through the source task before replacement/validation. |
| Live Google auth / real booking / authenticated CRM browser smoke | UNRUN | No authorized Google token/calendar/title mapping available here. Local API fixtures and rendered components do not prove real-provider access or live synchronization. |
| Scoped TypeScript / ESLint / whitespace | PASSED | New Calendar/meeting/contact files and dependency graph pass scoped TypeScript; scoped ESLint and `git diff --check` pass. |
| Full-repository TypeScript | FAILED — existing baseline | Seven pre-existing errors: billing queries tests (2), Fleet trip-rules tests (2), sheet-sync-progress tests (2), workspace-activation-bundles test (1). No new errors in this change. |
| Production build / migration / deployment / live-site checks | UNRUN | Explicitly outside this task's authorization. `npm run build` includes migration deployment, so it was not run. |

Final combined suite: **78 tests in 11 files passed** (25 Calendar/meeting tests, 3 public-contact tests, 28 callback tests, 22 Template tests).

### Contact exclusions

The previous personal number remains only as an **internal WhatsApp test recipient** in `src/lib/whatsapp-test-phone.ts`, and within the **payment UPI identity** `9329103106@ybl` in payment/plan configuration. These are not public sales phone links. Rewriting the UPI address would change the payment destination; rewriting the test recipient would redirect operational test messages. Neither was authorized. Official API sender declarations/settings remain intentionally unchanged. Existing saved database documents, customer-entered records and raster image text are not rewritten or claimed audited.

Browser evidence for this run: `/tmp/sheetomatic-contact-audit-JKmb8q/results.json`, `contact-desktop.png`, `contact-mobile.png`. These are temporary local artifacts, not published URLs.

## Activation requirements — not performed

1. Confirm the exact primary Sheetomatic organization, Google calendar ID and real booking event titles. The current site has Calendar booking links/embeds but no reusable Calendar read credential. Do not assume the Google Sheets service-account token is authorized.
2. Supply an **already-authorized** Calendar read token securely as `GOOGLE_CALENDAR_ACCESS_TOKEN`. This connector makes GET requests only to `www.googleapis.com/calendar/v3/.../events`; it does not request scopes, create OAuth grants or refresh credentials. Short-lived access tokens require an approved rotation/refresh mechanism before unattended production use. Expiry/permission failures retain cached bookings and show sync-needs-attention in Meetings.
3. Set these explicit values (secrets never in client code or source):

   ```text
   GOOGLE_CALENDAR_SYNC_ENABLED=true
   GOOGLE_CALENDAR_ORGANIZATION_ID=<verified primary organization ID>
   GOOGLE_CALENDAR_ID=<verified calendar ID>
   GOOGLE_CALENDAR_BOOKING_TITLES_JSON=["Exact appointment schedule event title"]
   GOOGLE_CALENDAR_ACCESS_TOKEN=<secure existing authorized token>
   CRON_SECRET=<secure existing cron secret>
   ```

4. Exact title allowlist plus an external attendee is the booking filter; unmatched/all-day/personal availability events are ignored. Review a real event before setting this filter. Do not configure a broad title shared with unrelated appointments.
5. After separate deployment approval, regenerate Prisma and apply the reviewed **additive Calendar migration only** to the verified database. Preserve the prior unpublished Template/callback work and live patch chain; do not deploy this entire checkout blindly. Deploy the reviewed delta and five-minute cron `/api/cron/google-calendar-bookings` together. Every call requires the cron bearer secret. Disabled by default; no new-table reads until scoped configuration is enabled.
6. Validate one authorized real booking, repeat sync, reschedule and cancellation in authenticated CRM. Check the last-complete-sync notice and count changes in IST. No reminders should be sent for imports. This final live check is still required.
7. Separately materialize the exact icon, inspect it, derive favicon/Apple/PWA sizes, update references/cache versions, then verify head links, shortcut icons and manifest pixels on desktop/mobile. This branding step is not yet implemented.

## Reproduce locally

Existing dependencies suffice; no package changes. Use only the isolated fixture database:

```sh
DATABASE_URL=postgresql://postgres@127.0.0.1:55439/template_checkout_test npx vitest run src/lib/leads/google-calendar-bookings.test.ts src/lib/leads/google-calendar-bookings.integration.test.ts src/lib/leads/crm-meetings.test.ts src/components/saas/crm-meetings-calendar.test.ts src/lib/public-contact.test.ts src/lib/leads/callback-policy.test.ts src/lib/leads/callback-agent.integration.test.ts src/app/api/leads/callback-agent/status/route.test.ts src/lib/templates/commerce.test.ts src/lib/templates/email-delivery.test.ts src/lib/templates/checkout.integration.test.ts
CONTACT_AUDIT_BROWSER=/usr/bin/chromium CONTACT_AUDIT_URL=http://127.0.0.1:3140 node scripts/verify-public-contacts.mjs
git diff --check
```

Integration tests are guarded to that exact local DB and clean up only their own fixtures. The browser audit requires a running local application and rejects non-loopback targets. To reproduce with another Chromium installation, adjust `CONTACT_AUDIT_BROWSER`, or omit it when Playwright's browser is installed.
