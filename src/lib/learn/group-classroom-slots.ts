import { prisma } from "@/lib/db";
import {
  groupClassIdentity,
  pickGroupSessionSlots,
} from "@/lib/learn/group-classroom";

const enrollmentSelect = {
  id: true,
  name: true,
  phone: true,
  organizationId: true,
  inboundLeadId: true,
  meetUrl: true,
  groupMeetUrl: true,
  groupKey: true,
} as const;

export async function listGroupSessionSlots(origin: {
  startsAt: Date;
  endsAt: Date;
  enrollment: { groupKey?: string | null; groupMeetUrl?: string | null };
}) {
  const identity = groupClassIdentity(origin.enrollment);
  if (!identity) return [];

  const enrollments = await prisma.courseEnrollment.findMany({
    where:
      identity.kind === "key"
        ? { groupKey: identity.value }
        : { groupMeetUrl: identity.value },
    select: enrollmentSelect,
  });
  if (enrollments.length === 0) return [];

  const candidates = await prisma.trainingCourseSlot.findMany({
    where: {
      enrollmentId: { in: enrollments.map((row) => row.id) },
    },
    include: { enrollment: { select: enrollmentSelect } },
  });

  return pickGroupSessionSlots(origin, candidates);
}
