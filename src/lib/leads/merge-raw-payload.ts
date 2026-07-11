import type { Prisma } from "@prisma/client";

/**
 * Merge ingest rawPayload updates without wiping nurture bookkeeping.
 * WA sync / sheet pull often replace payload with channel-only fields; nurture.sentEvents
 * must survive or welcome retries re-spam the same phone.
 */
export function mergeLeadRawPayload(
  existing: unknown,
  incoming: Prisma.InputJsonValue | undefined | null,
): Prisma.InputJsonValue | undefined {
  if (incoming === undefined || incoming === null) {
    return existing && typeof existing === "object"
      ? (existing as Prisma.InputJsonValue)
      : undefined;
  }

  if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
    return incoming;
  }
  if (typeof incoming !== "object" || Array.isArray(incoming)) {
    return incoming;
  }

  const existingObj = existing as Record<string, unknown>;
  const incomingObj = incoming as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...existingObj, ...incomingObj };

  const existingNurture = existingObj.nurture;
  const incomingNurture = incomingObj.nurture;

  if (
    existingNurture &&
    typeof existingNurture === "object" &&
    !Array.isArray(existingNurture)
  ) {
    if (
      incomingNurture &&
      typeof incomingNurture === "object" &&
      !Array.isArray(incomingNurture)
    ) {
      const prev = existingNurture as Record<string, unknown>;
      const next = incomingNurture as Record<string, unknown>;
      const prevSent =
        prev.sentEvents && typeof prev.sentEvents === "object"
          ? (prev.sentEvents as Record<string, unknown>)
          : {};
      const nextSent =
        next.sentEvents && typeof next.sentEvents === "object"
          ? (next.sentEvents as Record<string, unknown>)
          : {};
      merged.nurture = {
        ...prev,
        ...next,
        sentEvents: { ...prevSent, ...nextSent },
      };
    } else if (incomingNurture === undefined) {
      merged.nurture = existingNurture;
    }
  }

  return merged as Prisma.InputJsonValue;
}
