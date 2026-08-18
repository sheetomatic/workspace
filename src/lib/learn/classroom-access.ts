import { prisma } from "@/lib/db";
import { formatSlotWhen } from "@/lib/courses/slots";
import { classroomExpUnix, isClassroomLive } from "@/lib/learn/classroom";
import {
  createDailyMeetingToken,
  isDailyConfigured,
} from "@/lib/learn/daily";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { requireLearnEnrollment } from "@/lib/learn/session";

const slotSelect = {
  id: true,
  sessionNumber: true,
  title: true,
  startsAt: true,
  endsAt: true,
  status: true,
  meetUrl: true,
  classroomRoomName: true,
  classroomUrl: true,
  classroomStartedAt: true,
  classroomEndedAt: true,
  organizationId: true,
  inboundLeadId: true,
  enrollment: {
    select: {
      id: true,
      name: true,
      meetUrl: true,
      organizationId: true,
    },
  },
} as const;

export async function loadTeacherClassroom(slotId: string) {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "STAFF") && !user.isSuperAdmin) {
    return { ok: false as const, message: "Staff access required." };
  }

  const slot = await prisma.trainingCourseSlot.findFirst({
    where: { id: slotId },
    select: slotSelect,
  });
  if (!slot) {
    return { ok: false as const, message: "Session not found." };
  }

  let inOrg = slot.organizationId === user.organizationId;
  if (!inOrg && slot.inboundLeadId) {
    const lead = await prisma.inboundLead.findFirst({
      where: { id: slot.inboundLeadId, organizationId: user.organizationId },
      select: { id: true },
    });
    inOrg = Boolean(lead);
  }
  if (!inOrg && !user.isSuperAdmin) {
    return { ok: false as const, message: "Session not found." };
  }

  const live = isClassroomLive(slot);
  const meetUrl = slot.meetUrl || slot.enrollment.meetUrl;
  let embedUrl: string | null = null;
  if (live && slot.classroomRoomName && slot.classroomUrl && isDailyConfigured()) {
    const token = await createDailyMeetingToken({
      roomName: slot.classroomRoomName,
      userName: user.name?.trim() || "Trainer",
      isOwner: true,
      expUnix: classroomExpUnix(slot.endsAt),
    });
    embedUrl = `${slot.classroomUrl}?t=${encodeURIComponent(token)}`;
  }

  return {
    ok: true as const,
    role: "teacher" as const,
    live,
    configured: isDailyConfigured(),
    meetUrl,
    embedUrl,
    studentName: slot.enrollment.name,
    sessionNumber: slot.sessionNumber,
    title: slot.title,
    whenLabel: formatSlotWhen(slot.startsAt),
    slotId: slot.id,
  };
}

export async function loadStudentClassroom(slotId: string) {
  const enrollment = await requireLearnEnrollment();
  if (!enrollment) {
    return { ok: false as const, message: "Sign in to join class." };
  }

  const slot = await prisma.trainingCourseSlot.findFirst({
    where: { id: slotId, enrollmentId: enrollment.id },
    select: slotSelect,
  });
  if (!slot) {
    return { ok: false as const, message: "This class is not on your schedule." };
  }

  const live = isClassroomLive(slot);
  const meetUrl = slot.meetUrl || slot.enrollment.meetUrl;
  let embedUrl: string | null = null;
  if (live && slot.classroomRoomName && slot.classroomUrl && isDailyConfigured()) {
    const token = await createDailyMeetingToken({
      roomName: slot.classroomRoomName,
      userName: enrollment.name,
      isOwner: false,
      expUnix: classroomExpUnix(slot.endsAt),
    });
    embedUrl = `${slot.classroomUrl}?t=${encodeURIComponent(token)}`;
  }

  return {
    ok: true as const,
    role: "student" as const,
    live,
    configured: isDailyConfigured(),
    meetUrl,
    embedUrl,
    studentName: enrollment.name,
    sessionNumber: slot.sessionNumber,
    title: slot.title,
    whenLabel: formatSlotWhen(slot.startsAt),
    slotId: slot.id,
  };
}

export type ClassroomView = Exclude<
  Awaited<ReturnType<typeof loadTeacherClassroom>>,
  { ok: false }
>;
