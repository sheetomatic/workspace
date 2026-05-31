import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { createPayrollRunAction } from "@/lib/hr/hr-actions";

export default async function HrPayrollPage() {
  const user = await requireSession();
  const isAdmin = hasMinimumRole(user.role, "ADMIN");

  const runs = await prisma.payrollRun.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { periodStart: "desc" },
    take: 12,
  });

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Payroll"
        description="Draft payroll periods from attendance. Salary calculation and statutory export in next phase."
      />
      <HrSubNav activePath="/app/hr/payroll" />

      {isAdmin ? (
        <section className="ws-hr-panel">
          <h2>Create draft from attendance</h2>
          <form action={createPayrollRunAction} className="ws-hr-form ws-hr-form-inline">
            <label>
              Period start
              <input
                name="periodStart"
                type="date"
                defaultValue={monthStart.toISOString().slice(0, 10)}
              />
            </label>
            <label>
              Period end
              <input
                name="periodEnd"
                type="date"
                defaultValue={monthEnd.toISOString().slice(0, 10)}
              />
            </label>
            <button type="submit" className="btn-cta btn-primary">
              Generate draft
            </button>
          </form>
        </section>
      ) : null}

      <section className="ws-hr-panel">
        <h2>Payroll runs</h2>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Employees (present days)</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    No payroll drafts yet. Admins can generate one from attendance.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id}>
                    <td>
                      {run.periodStart.toLocaleDateString()} to{" "}
                      {run.periodEnd.toLocaleDateString()}
                    </td>
                    <td>{run.employeeCount}</td>
                    <td>{run.status}</td>
                    <td>{run.notes ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
