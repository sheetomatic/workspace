export const CLASSROOM_EARLY_MS = 15 * 60 * 1000;

export function teacherClassPath(slotId: string) {
  return `/app/leads/training/class/${slotId}`;
}

export function studentClassPath(slotId: string) {
  return `/learn/class/${slotId}`;
}

export function roomNameForSlot(slotId: string) {
  return `so-${slotId}`;
}

export function isClassroomLive(slot: {
  classroomStartedAt?: Date | string | null;
  classroomEndedAt?: Date | string | null;
}) {
  return Boolean(slot.classroomStartedAt) && !slot.classroomEndedAt;
}

export function canTeacherOpenClassroom(slot: {
  status: string;
  classroomStartedAt?: Date | string | null;
  classroomEndedAt?: Date | string | null;
}) {
  if (isClassroomLive(slot)) return true;
  return slot.status === "SCHEDULED";
}

export function classroomExpUnix(endsAt: Date, now = new Date()) {
  const endMs = Math.max(endsAt.getTime(), now.getTime() + 3 * 60 * 60 * 1000);
  return Math.floor((endMs + 2 * 60 * 60 * 1000) / 1000);
}
