import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import {
  LeaveBalanceCards,
  leaveTypeLabel,
  leaveTypeShort,
} from "@/components/hr/leave-balance-cards";
import { OdWfhPanel } from "@/components/hr/od-wfh-panel";
import { LeaveSwapPanel } from "@/components/hr/leave-swap-panel";
import { LeaveAllocationPanel } from "@/components/hr/leave-allocation-panel";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import {
  listLeaveBalancesForPage,
  listLeaveRequests,
} from "@/lib/hr/hr-store";
import { listLeaveBalances, listLeavePolicies } from "@/lib/hr/payroll";
import { listAttendanceExceptions } from "@/lib/hr/attendance-exceptions";
import { listSwapRequests } from "@/lib/hr/swap-requests";
import {
  reviewLeaveRequestAction,
  submitLeaveRequestAction,
} from "@/lib/hr/hr-actions";
import { listAssignableMembers } from "@/lib/tasks";

function statusClass(status: string) {
  if (status === "APPROVED") return "ws-leave-status is-approved";
  if (status === "REJECTED") return "ws-leave-status is-rejected";
  return "ws-leave-status is-pending";
}

export default async function HrLeavePage() {
  const user = await requireSession(undefined, { module: "HR" });
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  const year = new Date().getFullYear();

  const [requests, balances, exceptions, swaps, policies, allocBalances, members] =
    await Promise.all([
      listLeaveRequests(user.organizationId, isManager ? undefined : user.id),
      listLeaveBalances(user.organizationId, user.id, year),
      listAttendanceExceptions(
        user.organizationId,
        isManager ? undefined : { userId: user.id },
      ),
      listSwapRequests(
        user.organizationId,
        isManager ? undefined : { userId: user.id },
      ),
      isAdmin
        ? listLeavePolicies(user.organizationId, year)
        : Promise.resolve([]),
      isAdmin
        ? listLeaveBalancesForPage(user.organizationId, {
            viewerUserId: user.id,
            includeAllMembers: true,
            year,
          })
        : Promise.resolve([]),
      isAdmin
        ? listAssignableMembers(user.organizationId)
        : Promise.resolve([]),
    ]);

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Leave"
        description="Balances, leave, OD/WFH, leave/off-day swaps, and manager approvals."
      />
      <HrSubNav activePath="/app/hr/leave" isAdmin={isAdmin} />

      <LeaveBalanceCards
        year={year}
        balances={balances.map((row) => ({
          leaveType: row.leaveType,
          balanceDays: row.balanceDays,
          usedDays: row.usedDays,
        }))}
      />

      {isAdmin ? (
        <LeaveAllocationPanel
          year={year}
          policies={policies.map((p) => ({
            leaveType: p.leaveType,
            defaultDays: p.defaultDays,
          }))}
          members={members.map((m) => ({
            userId: m.id,
            name: m.name,
          }))}
          balances={allocBalances
            .filter((row) => row.leaveType !== "UNPAID")
            .map((row) => ({
              userId: row.userId,
              leaveType: row.leaveType,
              balanceDays: row.balanceDays,
              usedDays: row.usedDays,
            }))}
        />
      ) : null}

      <div className="ws-hr-split">
        <section className="ws-hr-panel">
          <h2>Apply for leave</h2>
          <form action={submitLeaveRequestAction} className="ws-hr-form">
            <label>
              Type
              <select name="leaveType" defaultValue="CASUAL">
                <option value="CASUAL">Casual (CL)</option>
                <option value="SICK">Sick (SL)</option>
                <option value="EARNED">Earned (EL)</option>
                <option value="UNPAID">Unpaid</option>
                <option value="COMP_OFF">Comp off</option>
              </select>
            </label>
            <label>
              From
              <input name="startDate" type="date" required />
            </label>
            <label>
              To
              <input name="endDate" type="date" required />
            </label>
            <label>
              Reason
              <textarea name="reason" rows={3} />
            </label>
            <button type="submit" className="btn-cta btn-primary">
              Submit request
            </button>
          </form>
        </section>
      </div>

      <section className="ws-hr-panel">
        <h2>{isManager ? "Team leave requests" : "My leave requests"}</h2>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                {isManager ? <th>Employee</th> : null}
                <th>Type</th>
                <th>Dates</th>
                <th>Days</th>
                <th>Status</th>
                {isManager ? <th>Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 4}>No leave requests yet.</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    {isManager ? (
                      <td>{req.user.name ?? req.user.email}</td>
                    ) : null}
                    <td>
                      <span className="ws-leave-type-pill">
                        {leaveTypeShort(req.leaveType)}
                      </span>{" "}
                      {leaveTypeLabel(req.leaveType)}
                    </td>
                    <td>
                      {req.startDate.toLocaleDateString("en-IN")} to{" "}
                      {req.endDate.toLocaleDateString("en-IN")}
                    </td>
                    <td>{req.days}</td>
                    <td>
                      <span className={statusClass(req.status)}>{req.status}</span>
                    </td>
                    {isManager && req.status === "PENDING" && req.userId !== user.id ? (
                      <td className="ws-hr-actions">
                        <form action={reviewLeaveRequestAction}>
                          <input type="hidden" name="id" value={req.id} />
                          <button
                            name="decision"
                            value="APPROVED"
                            className="btn-cta btn-primary btn-compact"
                          >
                            Approve
                          </button>
                          <button
                            name="decision"
                            value="REJECTED"
                            className="btn-cta btn-secondary btn-compact"
                          >
                            Reject
                          </button>
                        </form>
                      </td>
                    ) : isManager ? (
                      <td>
                        {req.userId === user.id && req.status === "PENDING"
                          ? "Awaiting another approver"
                          : "-"}
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <OdWfhPanel
        isManager={isManager}
        viewerUserId={user.id}
        requests={exceptions.map((req) => ({
          id: req.id,
          userId: req.userId,
          exceptionType: req.exceptionType,
          startDate: req.startDate,
          endDate: req.endDate,
          reason: req.reason,
          status: req.status,
          user: req.user,
        }))}
      />

      <LeaveSwapPanel
        isManager={isManager}
        viewerUserId={user.id}
        requests={swaps.map((req) => ({
          id: req.id,
          userId: req.userId,
          swapType: req.swapType,
          fromDate: req.fromDate,
          toDate: req.toDate,
          reason: req.reason,
          status: req.status,
          user: req.user,
        }))}
      />
    </div>
  );
}
