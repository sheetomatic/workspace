# Google Calendar appointments in CRM Meetings

The booking page `https://calendar.app.google/HBpNTTjBxrEvqnXS6` resolves to
the Google appointment schedule titled **Book Your Free Consultation Call**.
The connected calendar account is `training@sheetomatic.in`.

## Behaviour

- The Sheetomatic primary workspace imports current and future matching events.
- Matching is limited to configured appointment title fragments.
- A customer phone links the appointment to an existing lead or creates a
  Google Calendar lead. Events without a usable phone are skipped.
- The Google event ID is the idempotency key, so repeated page loads and cron
  runs do not create duplicate meetings.
- Reschedules update the CRM meeting time. Cancelled events are marked done.
- A Join button is shown only for a verified Google Meet, Zoom, or Teams URL.
  The Google Calendar event itself remains available through the Calendar link.
- Imported appointments do not send automatic WhatsApp reminders. A manager can
  still use the existing Remind action explicitly.

The worker runs every 15 minutes. Opening CRM > Meetings also requests a sync so
new bookings can appear without waiting for the next worker run.

## Production configuration

The existing `GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON` credential is reused with the
read-only Google Calendar scope. Share the `training@sheetomatic.in` calendar
with that service account and enable the Google Calendar API in its Google Cloud
project. No write access is required.

These non-secret Vercel production variables select the calendar and workspace:

- `GOOGLE_APPOINTMENTS_CALENDAR_ID=training@sheetomatic.in`
- `GOOGLE_APPOINTMENTS_ORG_SLUG=sheetomatic-technologies`
- `GOOGLE_APPOINTMENTS_TITLE_PREFIXES=Book Your Free Consultation Call|Requirement Understanding Session`

Apply migration `20261021120000_google_calendar_appointments` before deploying
the application. It adds an internal lead source plus three nullable external
event fields and one unique index. It does not modify existing lead records.

## Current appointment finding

On 21 October 2026, the connected calendar contains a confirmed appointment for
Bhaskar from 12:00 PM to 12:30 PM IST. Google currently returns no conference
link for that event. Configure the appointment schedule location as Google Meet
if future bookings should receive unique Meet links automatically.
