import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { EmployeeProfileForm } from "@/components/hr/employee-profile-form";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getEmployeeForForm } from "@/lib/hr/employees";

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

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title={data.profile ? "Employee profile" : "Register employee"}
        description={
          data.profile
            ? "Personal, job, compensation, statutory, bank, and documents."
            : "Complete registration to enable payroll, ESI/PF, and salary slips."
        }
      />
      <HrSubNav activePath="/app/hr/employees" />

      <p className="ws-hr-note">
        <Link href="/app/hr/employees">← All employees</Link>
      </p>

      <section className="ws-hr-panel">
        <EmployeeProfileForm data={data} canEdit={isAdmin} />
      </section>
    </div>
  );
}
