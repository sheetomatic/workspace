/** Sheetomatic AI marketing → auth entry points */
export const AI_LOGIN_HREF = "/login?product=ai&intent=login";
export const AI_START_FREE_HREF = "/login?product=ai&intent=start";

export function aiAppEntryHref(_intent?: string | null) {
  return "/ai/app";
}
