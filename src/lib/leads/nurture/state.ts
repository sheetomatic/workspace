import type { LeadNurtureEventId } from "@/lib/leads/nurture/events";
import { STAGE_NURTURE_MIN_GAP_HOURS } from "@/lib/leads/nurture/events";

/** Do not re-send the same welcome acknowledgment within this window (per phone). */
export const WELCOME_COOLDOWN_HOURS = 24;

export type LeadNurtureState = {
  sentEvents?: Partial<Record<LeadNurtureEventId, string>>;
  lastAssignedNurtureId?: string;
  lastSentAt?: string;
  paused?: boolean;
};

export function readNurtureState(rawPayload: unknown): LeadNurtureState {
  if (!rawPayload || typeof rawPayload !== "object") {
    return {};
  }
  const nurture = (rawPayload as Record<string, unknown>).nurture;
  if (!nurture || typeof nurture !== "object") {
    return {};
  }
  return nurture as LeadNurtureState;
}

function parseSentAt(value: string | undefined) {
  if (!value || value.startsWith("claim:")) {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function eventAlreadySent(state: LeadNurtureState, event: LeadNurtureEventId) {
  const value = state.sentEvents?.[event];
  if (!value) {
    return false;
  }
  // Stale pre-send claims (crash / send hang) should not block retries forever.
  if (typeof value === "string" && value.startsWith("claim:")) {
    const claimedAt = Date.parse(value.slice("claim:".length));
    if (Number.isFinite(claimedAt) && Date.now() - claimedAt > 5 * 60 * 1000) {
      return false;
    }
  }
  return true;
}

/** True if this event was delivered within the last `withinDays` (for alert re-nudge cooldown). */
export function eventSentWithinDays(
  state: LeadNurtureState,
  event: LeadNurtureEventId,
  withinDays: number,
) {
  const sentAt = parseSentAt(state.sentEvents?.[event]);
  if (sentAt == null) {
    return false;
  }
  const daysSince = (Date.now() - sentAt) / (24 * 60 * 60 * 1000);
  return daysSince < withinDays;
}

function hoursSince(iso: string | undefined) {
  if (!iso) {
    return Number.POSITIVE_INFINITY;
  }
  const ms = Date.now() - new Date(iso).getTime();
  return ms / (60 * 60 * 1000);
}

function isStageEvent(event: LeadNurtureEventId) {
  return event.startsWith("stage_") || event.startsWith("alert_");
}

export function canSendEvent(
  state: LeadNurtureState,
  event: LeadNurtureEventId,
  stageMinGapHours: number,
) {
  if (state.paused) {
    return false;
  }
  if (eventAlreadySent(state, event)) {
    return false;
  }
  if (isStageEvent(event) && hoursSince(state.lastSentAt) < stageMinGapHours) {
    return false;
  }
  return true;
}
