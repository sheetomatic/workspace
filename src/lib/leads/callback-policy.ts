/** Fixed IST business hours; India has no daylight-saving transitions. */
const IST_OFFSET = 330 * 60_000;
const DAY = 86_400_000;
export const CALLBACK_MINUTES = 15;
export const CALLBACK_SENDER_PHONE = "919685788980";

export function callbackSchedule(receivedAt: Date) {
  if (!Number.isFinite(receivedAt.getTime())) throw new Error("Invalid enquiry time");
  const local = new Date(receivedAt.getTime() + IST_OFFSET);
  const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const open = midnight + 9 * 3_600_000;
  const close = midnight + 19 * 3_600_000;
  const localMs = local.getTime();
  if (local.getUTCDay() !== 0 && localMs >= open && localMs + 15 * 60_000 <= close) {
    return { startAt: receivedAt, dueAt: new Date(receivedAt.getTime() + 15 * 60_000) };
  }
  let nextOpen = local.getUTCDay() !== 0 && localMs < open ? open : open + DAY;
  while (new Date(nextOpen).getUTCDay() === 0) nextOpen += DAY;
  return { startAt: new Date(nextOpen - IST_OFFSET), dueAt: new Date(nextOpen - IST_OFFSET + 15 * 60_000) };
}

export function isCallbackWorkingTime(now: Date) {
  const local = new Date(now.getTime() + IST_OFFSET);
  return local.getUTCDay() !== 0 && local.getUTCHours() >= 9 && local.getUTCHours() < 19;
}

export function callbackDeadlineLabel(dueAt: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(dueAt) + " IST";
}

export function callbackAcknowledgement(assignee: string, dueAt: Date) {
  return `Thank you for contacting Sheetomatic. Your enquiry has been assigned to ${assignee}. You will receive a callback by ${callbackDeadlineLabel(dueAt)}. Our working hours are Monday–Saturday, 9 AM–7 PM IST; Sunday closed.`;
}

export function callbackAgentConfig(env: Record<string, string | undefined> = process.env) {
  const organizationId = env.CRM_CALLBACK_ORGANIZATION_ID?.trim();
  const assigneeId = env.CRM_CALLBACK_ASSIGNEE_ID?.trim();
  const ownerId = env.CRM_CALLBACK_OWNER_ID?.trim();
  const enabledSince = new Date(env.CRM_CALLBACK_ENABLED_SINCE ?? "");
  if (env.CRM_CALLBACK_ENABLED !== "true" || !organizationId || !assigneeId || !ownerId ||
      !Number.isFinite(enabledSince.getTime())) return null;
  return { organizationId, assigneeId, ownerId, enabledSince };
}
