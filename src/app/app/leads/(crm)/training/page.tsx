import {
  TrainingStudentsPanel,
  type TrainingStudentView,
} from "@/components/saas/training-students-panel";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import "@/components/saas/training-students-panel.css";
import { listActiveTrainingStudents } from "@/lib/courses/slots";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";

export default async function CrmTrainingPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const [studentsRaw, totalScheduled, enrollments] = await Promise.all([
    listActiveTrainingStudents({
      organizationId: user.organizationId,
      take: 120,
    }),
    prisma.trainingCourseSlot.count({
      where: {
        organizationId: user.organizationId,
        status: "SCHEDULED",
      },
    }),
    prisma.courseEnrollment.count({
      where: { organizationId: user.organizationId },
    }),
  ]);

  const students: TrainingStudentView[] = studentsRaw.map((student) => ({
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
    })),
  }));

  const upcomingSlots = students.reduce(
    (sum, student) => sum + student.upcomingCount,
    0,
  );

  return (
    <CrmSubmoduleShell
      title="Training"
      description="Student-wise training groups — expand a student to see their sessions."
      kpis={[
        {
          label: "Students",
          value: String(students.length),
          accent: "blue",
        },
        {
          label: "Upcoming slots",
          value: String(upcomingSlots),
          accent: "success",
        },
        { label: "Scheduled total", value: String(totalScheduled) },
        {
          label: "Enrollments",
          value: String(enrollments),
        },
      ]}
    >
      <TrainingStudentsPanel students={students} />
    </CrmSubmoduleShell>
  );
}
