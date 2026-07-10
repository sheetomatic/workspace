import Link from "next/link";
import { formatInr } from "@/lib/leads/categories";
import type { EmployeeListItem } from "@/lib/hr/employees";
import { TASK_DEPARTMENT_LABELS } from "@/lib/tasks";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  EXITED: "Exited",
};

export function EmployeesTable({
  employees,
  isAdmin,
}: {
  employees: EmployeeListItem[];
  isAdmin: boolean;
}) {
  if (employees.length === 0) {
    return (
      <section className="ws-hr-panel">
        <p className="ws-apple-record-empty">
          No team members yet. Invite people under Team, then register them here.
        </p>
      </section>
    );
  }

  return (
    <section className="ws-hr-panel">
      <div className="ws-ims-panel-head">
        <h2>Employees</h2>
        <span className="ws-apple-cell-secondary">{employees.length} people</span>
      </div>
      <div className="ws-hr-table-wrap">
        <table className="ws-hr-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Role / job</th>
              <th>Statutory</th>
              {isAdmin ? <th>Salary</th> : null}
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((row) => {
              const dept =
                row.department != null
                  ? TASK_DEPARTMENT_LABELS[row.department]
                  : null;
              const jobBits = [row.designation, dept].filter(Boolean);
              const statutory = [
                row.profile?.esiApplicable ? "ESI" : null,
                row.profile?.pfApplicable ? "PF" : null,
              ]
                .filter(Boolean)
                .join(" · ");
              const href = `/app/hr/employees/${row.membershipId}`;
              return (
                <tr key={row.membershipId}>
                  <td>
                    <strong>{row.name ?? row.email}</strong>
                    <div className="ws-apple-cell-secondary">{row.email}</div>
                  </td>
                  <td>{row.profile?.employeeCode ?? row.staffCode ?? "—"}</td>
                  <td>
                    {jobBits.length > 0 ? jobBits.join(" · ") : "—"}
                    <div className="ws-apple-cell-secondary">{row.role}</div>
                  </td>
                  <td>{statutory || "—"}</td>
                  {isAdmin ? (
                    <td>
                      {row.monthlySalary != null && row.monthlySalary > 0
                        ? formatInr(row.monthlySalary)
                        : "—"}
                    </td>
                  ) : null}
                  <td>
                    {row.deactivatedAt ? (
                      <span className="ws-leave-status is-rejected">Inactive</span>
                    ) : row.profile ? (
                      <span className="ws-leave-status is-approved">
                        {STATUS_LABEL[row.profile.status] ?? row.profile.status}
                      </span>
                    ) : (
                      <span className="ws-leave-status is-pending">Not registered</span>
                    )}
                  </td>
                  <td>
                    <Link href={href} className="btn-secondary btn-sm">
                      {row.profile ? (isAdmin ? "Edit" : "View") : "Register"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
