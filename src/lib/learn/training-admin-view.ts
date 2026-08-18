import { withDbRetry } from "@/lib/db";
import { listActiveTrainingStudents } from "@/lib/courses/slots";
import type { TrainingStudentView } from "@/components/saas/training-students-panel";

export function toTrainingStudentViews(
  studentsRaw: Awaited<ReturnType<typeof listActiveTrainingStudents>>,
): TrainingStudentView[] {
  return studentsRaw.map((student) => ({
    id: student.id,
    name: student.name,
    phone: student.phone,
    email: student.email,
    status: student.status,
    daysLabel: student.daysLabel,
    frequency: student.frequency,
    sessionTimeIst: student.sessionTimeIst,
    sessionDurationMin: student.sessionDurationMin,
    totalSessions: student.totalSessions,
    joinUrl: student.joinUrl,
    inboundLeadId: student.inboundLeadId,
    bookingToken: student.bookingToken,
    upcomingCount: student.upcomingCount,
    completedCount: student.completedCount,
    totalBooked: student.totalBooked,
    nextWhenLabel: student.nextWhenLabel,
    slots: student.slots.map((slot) => ({
      id: slot.id,
      sessionNumber: slot.sessionNumber,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
      title: slot.title,
      status: slot.status,
      meetUrl: slot.meetUrl,
      whenLabel: slot.whenLabel,
      joinUrl: slot.joinUrl,
      classroomLive: Boolean(
        slot.classroomStartedAt && !slot.classroomEndedAt,
      ),
      materials: slot.materials,
    })),
  }));
}

export async function loadTrainingStudentsSafe(params: {
  organizationId?: string | null;
  platformWide?: boolean;
}) {
  try {
    const studentsRaw = await withDbRetry(() =>
      listActiveTrainingStudents({
        organizationId: params.organizationId,
        platformWide: params.platformWide,
        take: 120,
      }),
    );
    return { students: toTrainingStudentViews(studentsRaw), loadError: false };
  } catch (error) {
    console.error("[training] students unavailable", error);
    return { students: [] as TrainingStudentView[], loadError: true };
  }
}
