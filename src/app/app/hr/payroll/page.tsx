import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { PayrollGenerateForm } from "@/components/hr/payroll-generate-form";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatInr } from "@/lib/leads/categories";
import { istCalendarYmd } from "@/lib/hr/payroll";

export default async function HrPayrollPage() {
  const user = await requireSession(undefined, { module: "HR" });
  const isAdmin = hasMinimumRole(user.role, "ADMIN");

  const [runs, salaryReadyCount] = await Promise.all([
    prisma.payrollRun.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { periodStart: "desc" },
      take: 12,
      include: {
        lines: {
          where: isAdmin ? undefined : { userId: user.id },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { user: { name: "asc" } },
        },
      },
    }),
    isAdmin
      ? prisma.membership.count({
          where: {
            organizationId: user.organizationId,
            deactivatedAt: null,
            monthlySalary: { gt: 0 },
          },
        })
      : Promise.resolve(0),
  ]);

  const todayYmd = istCalendarYmd();
  const [y, m] = todayYmd.split("-").map(Number);
  const monthStartYmd = `${y}-${String(m).padStart(2, "0")}-01`;

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Payroll"
        description={
          isAdmin
            ? "Salary from attendance — payable days × (monthly salary ÷ working days). Paid leave counts as payable; unpaid leave does not."
            : "Your attendance-based payslip lines for this workspace."
        }
      />
      <HrSubNav activePath="/app/hr/payroll" isAdmin={isAdmin} />

      {isAdmin ? (
        <section className="hs-quick-stats" aria-label="Payroll readiness">
          <article className="hs-quick-stat accent-blue">
            <span>Employees with salary</span>
            <strong>{salaryReadyCount}</strong>
          </article>
          <article className="hs-quick-stat accent-success">
            <span>Payroll runs</span>
            <strong>{runs.length}</strong>
          </article>
        </section>
      ) : null}

      {isAdmin && salaryReadyCount === 0 ? (
        <p className="ws-hr-note">
          Set <strong>Monthly salary</strong> under{" "}
          <Link href="/app/hr/employees">Employees</Link> (or{" "}
          <Link href="/app/team">Team</Link>) before generating payroll.
        </p>
      ) : null}

      {isAdmin ? (
        <PayrollGenerateForm defaultStart={monthStartYmd} defaultEnd={todayYmd} />
      ) : null}

      {runs.map((run) => {
        const ownLine = !isAdmin ? run.lines[0] : null;
        return (
          <section key={run.id} className="ws-hr-panel">
            <div className="ws-ims-panel-head">
              <h2>
                {run.periodStart.toLocaleDateString("en-IN")} –{" "}
                {run.periodEnd.toLocaleDateString("en-IN")} · {run.status}
              </h2>
              <span className="ws-apple-cell-secondary">
                {isAdmin ? (
                  <>
                    {run.employeeCount} employees · Net{" "}
                    {run.totalNet != null ? formatInr(Number(run.totalNet)) : "—"}
                  </>
                ) : ownLine ? (
                  <>Your net {formatInr(Number(ownLine.netPay))}</>
                ) : (
                  "No line for you in this run"
                )}
              </span>
            </div>
            {isAdmin && run.notes ? <p className="ws-hr-note">{run.notes}</p> : null}
            <div className="ws-hr-table-wrap">
              <table className="ws-hr-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Present</th>
                    <th>Leave</th>
                    <th>Absent</th>
                    <th>Half</th>
                    <th>Payable</th>
                    <th>Monthly</th>
                    <th>Earned</th>
                    <th>Net pay</th>
                    <th>Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {run.lines.length === 0 ? (
                    <tr>
                      <td colSpan={10}>
                        {isAdmin
                          ? "No salary lines (legacy draft without calculation)."
                          : "No payslip line for you in this run."}
                      </td>
                    </tr>
                  ) : (
                    run.lines.map((line) => (
                      <tr key={line.id}>
                        <td>{line.user.name ?? line.user.email}</td>
                        <td>{line.presentDays}</td>
                        <td>{line.leaveDays}</td>
                        <td>{line.absentDays}</td>
                        <td>{line.halfDays}</td>
                        <td>
                          {line.payableDays}/{line.workingDays}
                        </td>
                        <td>{formatInr(Number(line.monthlySalary))}</td>
                        <td>{formatInr(Number(line.earnedSalary))}</td>
                        <td>
                          <strong>{formatInr(Number(line.netPay))}</strong>
                        </td>
                        <td>
                          <Link
                            href={`/app/hr/payroll/slip/${line.id}`}
                            className="btn-secondary btn-sm"
                          >
                            Slip
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {runs.length === 0 ? (
        <section className="ws-hr-panel">
          <p className="ws-apple-record-empty">
            {isAdmin
              ? "No payroll runs yet. Mark attendance, set salaries on Team, then Calculate salary."
              : "No payroll runs yet. Ask an admin to generate payroll after attendance is marked."}
          </p>
        </section>
      ) : null}
    </div>
  );
}
