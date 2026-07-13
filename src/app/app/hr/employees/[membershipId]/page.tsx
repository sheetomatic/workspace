import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { EmployeeProfileForm } from "@/components/hr/employee-profile-form";
import { OnboardingChecklist } from "@/components/hr/onboarding-checklist";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getEmployeeForForm } from "@/lib/hr/employees";
import { getOnboardingChecklist } from "@/lib/hr/onboarding";
import { listHrShifts } from "@/lib/hr/shifts";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import {
  resolveEnabledHrSubModules,
  requireHrSubModule,
} from "@/lib/hr/hr-sub-modules";

type PageProps = {
  params: Promise<{ membershipId: string }>;
};

export default async function HrEmployeeDetailPage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "HR" });
  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  const { membershipId } = await params;

  const data = await getEmployeeForForm(user.organizationId, membershipId, {
    includeSensitive: isAdmin,
  });

  if (!data) {
    notFound();
  }
  if (!isAdmin && data.userId !== user.id) {
    notFound();
  }

  const [checklist, shifts, hrSettings] = await Promise.all([
    data.profile
      ? getOnboardingChecklist({
          organizationId: user.organizationId,
          employeeProfileId: data.profile.id,
        })
      : Promise.resolve(null),
    listHrShifts(user.organizationId, true),
    getOrCreateHrSettings(user.organizationId),
  ]);

  if (!requireHrSubModule(hrSettings.enabledHrSubModules, "employees")) {
    redirect("/app/hr");
  }

  const enabledSubModules = resolveEnabledHrSubModules(
    hrSettings.enabledHrSubModules,
  );

  const canCompleteOnboarding =
    Boolean(data.profile) && (isAdmin || data.userId === user.id);

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title={data.profile ? "Employee profile" : "Register employee"}
        description={
          data.profile
            ? "Personal, job, compensation, statutory, bank, documents, and onboarding."
            : "Complete registration to enable payroll, ESI/PF, and salary slips."
        }
      />
      <HrSubNav
        activePath="/app/hr/employees"
        isAdmin={isAdmin}
        enabledSubModules={enabledSubModules}
      />

      <p className="ws-hr-note">
        <Link href="/app/hr/employees">← All employees</Link>
        {isAdmin ? (
          <>
            {" · "}
            <Link href="/app/team?invite=1">Invite another employee</Link>
          </>
        ) : null}
      </p>

      {checklist && data.profile ? (
        <section className="ws-hr-panel">
          <OnboardingChecklist
            employeeProfileId={data.profile.id}
            onboardingStatus={checklist.onboardingStatus}
            educationSummary={checklist.educationSummary}
            experienceSummary={checklist.experienceSummary}
            items={checklist.items}
            allRequiredUploaded={checklist.allRequiredUploaded}
            canComplete={canCompleteOnboarding}
            canSkip={isAdmin}
          />
        </section>
      ) : null}

      <section className="ws-hr-panel">
        <EmployeeProfileForm
          data={data}
          canEdit={isAdmin}
          canEditDocs={isAdmin || data.userId === user.id}
          shifts={shifts.map((s) => ({
            id: s.id,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
          }))}
        />
      </section>
    </div>
  );
}
