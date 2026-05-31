/** Tunables for ~500 concurrent workspace users on Vercel + Neon pooler. */

export const SCALE = {
  /** Max tasks loaded per tasks page request */
  TASK_PAGE_SIZE: 50,
  /** Max due reminders processed per cron batch */
  CRON_REMINDER_BATCH: 100,
  /** Max cron batches per run (100 x 10 = 1000 reminders/run) */
  CRON_REMINDER_MAX_BATCHES: 10,
  /** Inbox conversation list cache (seconds) */
  INBOX_LIST_REVALIDATE_SEC: 8,
  /** AI parse/transcribe requests per user per minute */
  AI_ROUTE_LIMIT_PER_MIN: 30,
} as const;

export function taskPageFromSearchParam(raw: string | undefined) {
  const page = Number(raw ?? "1");
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.min(Math.floor(page), 500);
}
