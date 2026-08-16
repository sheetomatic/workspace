import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import { TrainingStudentsPanel } from "@/components/saas/training-students-panel";
import { TrainingTabs } from "@/components/saas/training-tabs";
import "@/components/saas/leads-machine.css";
import "@/components/saas/training-students-panel.css";
import { loadTrainingStudentsSafe } from "@/lib/learn/training-admin-view";
import { requireSession } from "@/lib/require-session";
import { isPrimaryOrganization } from "@/lib/platform";
import { prisma } from "@/lib/db";

export default async function MySpaceTrainingPage() {
  const user = await requireSession("MANAGER");
  const isPrimary = await isPrimaryOrganization(user.organizationId);
  const platformWide = user.isSuperAdmin || isPrimary;

  const { students, loadError } = await loadTrainingStudentsSafe({
    organizationId: platformWide ? null : user.organizationId,
    platformWide,
  });

  let totalScheduled = 0;
  let enrollments = 0;
  try {
    const orgWhere = platformWide
      ? {}
      : { organizationId: user.organizationId };
    [totalScheduled, enrollments] = await Promise.all([
      prisma.trainingCourseSlot.count({
        where: { status: "SCHEDULED", ...orgWhere },
      }),
      prisma.courseEnrollment.count({
        where: platformWide
          ? { status: { in: ["CONFIRMED", "PAYMENT_PENDING"] } }
          : {
              organizationId: user.organizationId,
              status: { in: ["CONFIRMED", "PAYMENT_PENDING"] },
            },
      }),
    ]);
  } catch (error) {
    console.error("[my-space-training] counts unavailable", error);
  }

  const upcomingSlots = students.reduce(
    (sum, student) => sum + student.upcomingCount,
    0,
  );

  return (
    <CrmSubmoduleShell
      title="Students"
      description="Same student schedule you use on Learn — Meet link, mark done, recordings."
      leadsHref={null}
      kpis={[
        { label: "Students", value: String(students.length), accent: "blue" },
        {
          label: "Upcoming slots",
          value: String(upcomingSlots),
          accent: "success",
        },
        { label: "Scheduled total", value: String(totalScheduled) },
        { label: "Enrollments", value: String(enrollments) },
      ]}
    >
      <TrainingTabs current="students" basePath="/app/my-space/training" />
      {loadError ? (
        <p className="training-banner is-error">
          Students could not load just now. Try again — this page stays open.
        </p>
      ) : (
        <TrainingStudentsPanel students={students} canManage />
      )}
    </CrmSubmoduleShell>
  );
}
