import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { EmployeesTable } from "@/components/hr/employees-table";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listEmployees } from "@/lib/hr/employees";

export default async function HrEmployeesPage() {
  const user = await requireSession(undefined, { module: "HR" });
  const isAdmin = hasMinimumRole(user.role, "ADMIN");

  const all = await listEmployees(user.organizationId);
  const employees = isAdmin
    ? all
    : all.filter((row) => row.userId === user.id);

  const registered = employees.filter((e) => e.profile != null).length;
  const withSalary = isAdmin
    ? employees.filter((e) => e.monthlySalary != null && e.monthlySalary > 0).length
    : 0;

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Employees"
        description={
          isAdmin
            ? "Register team members with salary components, ESI/PF, bank details, and documents."
            : "Your employee profile for this workspace."
        }
      />
      <HrSubNav activePath="/app/hr/employees" isAdmin={isAdmin} />

      {isAdmin ? (
        <section className="hs-quick-stats" aria-label="Employee readiness">
          <article className="hs-quick-stat accent-blue">
            <span>Team members</span>
            <strong>{employees.length}</strong>
          </article>
          <article className="hs-quick-stat accent-success">
            <span>Registered profiles</span>
            <strong>{registered}</strong>
          </article>
          <article className="hs-quick-stat accent-indigo">
            <span>With salary</span>
            <strong>{withSalary}</strong>
          </article>
        </section>
      ) : null}

      {isAdmin ? (
        <p className="ws-hr-note">
          <Link href="/app/team?invite=1" className="btn-cta btn-primary btn-compact">
            Invite employee
          </Link>{" "}
          from Team (email + manager + onboarding). Then open{" "}
          <strong>Register</strong> here to complete the HR profile and required
          docs (Education, CV, Experience, NOC, Aadhaar, PAN).
        </p>
      ) : null}

      <EmployeesTable employees={employees} isAdmin={isAdmin} />
    </div>
  );
}
