import { TrainingStudentsPanel } from "@/components/saas/training-students-panel";
import { TrainingTabs } from "@/components/saas/training-tabs";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import "@/components/saas/training-students-panel.css";
import { loadTrainingStudentsSafe } from "@/lib/learn/training-admin-view";
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

  const { students, loadError } = await loadTrainingStudentsSafe({
    organizationId: user.organizationId,
  });

  let totalScheduled = 0;
  let enrollments = 0;
  try {
    [totalScheduled, enrollments] = await Promise.all([
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
  } catch (error) {
    console.error("[crm-training] counts unavailable", error);
  }

  const upcomingSlots = students.reduce(
    (sum, student) => sum + student.upcomingCount,
    0,
  );

  return (
    <CrmSubmoduleShell
      title="Students"
      description="Students, live sessions, and the curriculum you teach from this workspace."
      leadsHref={learnPortal ? null : "/app/leads"}
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
      {loadError ? (
        <p className="training-banner is-error">
          Students could not load just now. Try again — this page stays open.
        </p>
      ) : (
        <TrainingStudentsPanel
          students={students}
          canManage={hasMinimumRole(user.role, "STAFF")}
        />
      )}
    </CrmSubmoduleShell>
  );
}
