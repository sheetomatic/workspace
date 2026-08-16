import {
  TrainingStudentsPanel,
  type TrainingStudentView,
} from "@/components/saas/training-students-panel";
import { TrainingTabs } from "@/components/saas/training-tabs";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import "@/components/saas/training-students-panel.css";
import { listActiveTrainingStudents } from "@/lib/courses/slots";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { prisma } from "@/lib/db";
import { isLearnPortalRequest } from "@/lib/tenant-host";

export default async function CrmTrainingPage() {
  const learnPortal = await isLearnPortalRequest();
  const user = await requireSession(
    undefined,
    learnPortal ? undefined : { module: "CRM" },
  );
  if (!learnPortal) {
    await requireCrmSubModule(user, "training");
  }
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
      materials: slot.materials,
    })),
  }));

  const upcomingSlots = students.reduce(
    (sum, student) => sum + student.upcomingCount,
    0,
  );

  return (
    <CrmSubmoduleShell
      title="Training"
      description="Students, live sessions, and the curriculum you teach from this workspace."
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
      <TrainingTabs current="students" />
      <TrainingStudentsPanel
        students={students}
        canManage={hasMinimumRole(user.role, "STAFF")}
      />
    </CrmSubmoduleShell>
  );
}
