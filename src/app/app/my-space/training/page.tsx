import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import {
  TrainingStudentsPanel,
  type TrainingStudentView,
} from "@/components/saas/training-students-panel";
import "@/components/saas/training-students-panel.css";
import { requireSession } from "@/lib/require-session";
import { isPrimaryOrganization } from "@/lib/platform";
import { listActiveTrainingStudents } from "@/lib/courses/slots";

export default async function MySpaceTrainingPage() {
  const user = await requireSession("MANAGER");
  const isPrimary = await isPrimaryOrganization(user.organizationId);
  const platformWide = user.isSuperAdmin || isPrimary;

  const studentsRaw = await listActiveTrainingStudents({
    organizationId: platformWide ? null : user.organizationId,
    platformWide,
    take: 120,
  });

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

  return (
    <div className="saas-page ws-ims-sf">
      <div className="ws-ims-page">
        <TaskPageToolbar
          title="Booked training slots"
          description="Active students first. Open a student to see their schedule and join link."
          actions={
            <Link href="/app/my-space" className="ws-btn ws-btn-secondary">
              Back to My Space
            </Link>
          }
        />

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>Active students</h2>
          </div>
          <TrainingStudentsPanel students={students} />
        </section>
      </div>
    </div>
  );
}
