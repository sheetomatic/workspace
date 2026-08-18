import { prisma } from "@/lib/db";
import { formatSlotWhen } from "@/lib/courses/slots";
import { classroomExpUnix, isClassroomLive } from "@/lib/learn/classroom";
import {
  createDailyMeetingToken,
  isDailyConfigured,
} from "@/lib/learn/daily";
import {
  formatGroupRoster,
  groupClassIdentity,
  pickLiveGroupClassroom,
} from "@/lib/learn/group-classroom";
import { listGroupSessionSlots } from "@/lib/learn/group-classroom-slots";
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
      groupMeetUrl: true,
      groupKey: true,
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

  const groupSlots = groupClassIdentity(slot.enrollment)
    ? await listGroupSessionSlots(slot)
    : [];
  const livePeer = pickLiveGroupClassroom(groupSlots);
  const roomName = livePeer?.classroomRoomName || slot.classroomRoomName;
  const roomUrl = livePeer?.classroomUrl || slot.classroomUrl;
  const live = isClassroomLive(livePeer ?? slot);
  const meetUrl = slot.meetUrl || slot.enrollment.meetUrl;
  const groupMeetUrl = slot.enrollment.groupMeetUrl?.trim() || null;
  const groupNames = (groupSlots.length > 0 ? groupSlots : [slot]).map(
    (row) => row.enrollment.name,
  );
  let embedUrl: string | null = null;
  if (live && roomName && roomUrl && isDailyConfigured()) {
    try {
      const token = await createDailyMeetingToken({
        roomName,
        userName: user.name?.trim() || "Trainer",
        isOwner: true,
        expUnix: classroomExpUnix(slot.endsAt),
      });
      embedUrl = `${roomUrl}?t=${encodeURIComponent(token)}`;
    } catch (error) {
      console.error("[classroom] Daily embed skipped", error);
    }
  }

  return {
    ok: true as const,
    role: "teacher" as const,
    live,
    configured: true,
    meetUrl,
    groupMeetUrl,
    embedUrl,
    studentName:
      groupNames.length > 1
        ? formatGroupRoster(groupNames)
        : slot.enrollment.name,
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

  const groupSlots = groupClassIdentity(slot.enrollment)
    ? await listGroupSessionSlots(slot)
    : [];
  const livePeer = pickLiveGroupClassroom([slot, ...groupSlots]);
  const roomName = livePeer?.classroomRoomName || slot.classroomRoomName;
  const roomUrl = livePeer?.classroomUrl || slot.classroomUrl;
  const live = Boolean(livePeer) || isClassroomLive(slot);
  const meetUrl = slot.meetUrl || slot.enrollment.meetUrl;
  const groupMeetUrl = slot.enrollment.groupMeetUrl?.trim() || null;
  let embedUrl: string | null = null;
  if (live && roomName && roomUrl && isDailyConfigured()) {
    try {
      const token = await createDailyMeetingToken({
        roomName,
        userName: enrollment.name,
        isOwner: false,
        expUnix: classroomExpUnix(slot.endsAt),
      });
      embedUrl = `${roomUrl}?t=${encodeURIComponent(token)}`;
    } catch (error) {
      console.error("[classroom] Daily embed skipped", error);
    }
  }

  return {
    ok: true as const,
    role: "student" as const,
    live,
    configured: true,
    meetUrl,
    groupMeetUrl,
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
