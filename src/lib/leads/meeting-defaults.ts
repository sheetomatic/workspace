/**
 * Team meeting defaults for the CRM Meeting tab.
 * TODO: move to org-level settings when more tenants need their own values.
 */

/** Standing Google Meet room used for client meetings. */
export const DEFAULT_CLIENT_MEET_URL = "https://meet.google.com/axy-yorv-ofn";

/**
 * Google Calendar week-view embed for the team calendar.
 * Renders fully when the viewer is signed into this Google account;
 * other viewers see only free/busy or a permission notice.
 */
export const TEAM_GOOGLE_CALENDAR_EMBED_URL =
  "https://calendar.google.com/calendar/embed?src=sheetomatic%40gmail.com&ctz=Asia%2FKolkata&mode=WEEK&showTitle=0&showPrint=0&showTz=0&showCalendars=0";

export const TEAM_GOOGLE_CALENDAR_OPEN_URL = "https://calendar.google.com/calendar/u/0/r/week";
