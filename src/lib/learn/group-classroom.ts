import { createHash } from "node:crypto";
import { isClassroomLive } from "@/lib/learn/classroom";

/** Slots whose times sit in the same evening/window share one group room. */
export const GROUP_SESSION_PAD_MS = 3 * 60 * 60 * 1000;
const GROUP_ROOM_BUCKET_MS = GROUP_SESSION_PAD_MS;

export function groupClassIdentity(enrollment: {
  groupKey?: string | null;
  groupMeetUrl?: string | null;
}): { kind: "key"; value: string } | { kind: "url"; value: string } | null {
  const key = enrollment.groupKey?.trim();
  if (key) return { kind: "key", value: key };
  const url = enrollment.groupMeetUrl?.trim();
  if (url) return { kind: "url", value: url };
  return null;
}

export function slotsShareSessionWindow(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
  padMs = GROUP_SESSION_PAD_MS,
) {
  return (
    a.startsAt.getTime() - padMs < b.endsAt.getTime() &&
    b.startsAt.getTime() - padMs < a.endsAt.getTime()
  );
}

export function pickGroupSessionSlots<T extends { startsAt: Date; endsAt: Date }>(
  origin: { startsAt: Date; endsAt: Date },
  candidates: T[],
): T[] {
  return candidates.filter((slot) => slotsShareSessionWindow(slot, origin));
}

export function groupRoomToken(identity: {
  kind: "key" | "url";
  value: string;
}) {
  if (identity.kind === "key") {
    const safe = identity.value.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-");
    return (safe.replace(/^-|-$/g, "") || "group").slice(0, 28);
  }
  return createHash("sha1").update(identity.value).digest("hex").slice(0, 16);
}

export function roomNameForGroup(
  identity: { kind: "key" | "url"; value: string },
  startsAt: Date,
) {
  const token = groupRoomToken(identity);
  const bucket = Math.floor(startsAt.getTime() / GROUP_ROOM_BUCKET_MS);
  return `so-g-${token}-${bucket}`.slice(0, 80);
}

export function classroomMaxParticipants(groupSize: number) {
  const size = Number.isFinite(groupSize) ? Math.max(1, Math.floor(groupSize)) : 1;
  return Math.min(40, Math.max(size <= 1 ? 6 : 12, size + 4));
}

export function pickLiveGroupClassroom<
  T extends {
    classroomRoomName?: string | null;
    classroomUrl?: string | null;
    classroomStartedAt?: Date | string | null;
    classroomEndedAt?: Date | string | null;
  },
>(slots: T[]): T | undefined {
  return (
    slots.find(
      (slot) =>
        isClassroomLive(slot) &&
        Boolean(slot.classroomRoomName?.trim()) &&
        Boolean(slot.classroomUrl?.trim()),
    ) ?? slots.find((slot) => isClassroomLive(slot))
  );
}

export function earliestClassroomStartedAt(
  slots: { classroomStartedAt?: Date | string | null }[],
  fallback = new Date(),
) {
  const times = slots
    .map((slot) =>
      slot.classroomStartedAt ? new Date(slot.classroomStartedAt).getTime() : NaN,
    )
    .filter((value) => Number.isFinite(value));
  if (times.length === 0) return fallback;
  return new Date(Math.min(...times));
}

export function latestSlotEndsAt(
  slots: { endsAt: Date }[],
  fallback: Date,
) {
  return slots.reduce(
    (latest, slot) => (slot.endsAt.getTime() > latest.getTime() ? slot.endsAt : latest),
    fallback,
  );
}

export function formatGroupRoster(names: string[]) {
  const clean = names.map((name) => name.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0]!;
  if (clean.length <= 3) return clean.join(", ");
  return `${clean.slice(0, 2).join(", ")} + ${clean.length - 2} more`;
}
