"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  setLeaveBalanceAction,
  upsertLeavePolicyAction,
} from "@/lib/hr/hr-actions";
import { leaveTypeLabel, leaveTypeShort } from "@/components/hr/leave-balance-cards";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

const LEAVE_TYPES = ["CASUAL", "SICK", "EARNED", "COMP_OFF"] as const;

export type LeavePolicyRow = {
  leaveType: string;
  defaultDays: number;
};

export type LeaveAllocMember = {
  userId: string;
  name: string;
};

export type LeaveAllocBalance = {
  userId: string;
  leaveType: string;
  balanceDays: number;
  usedDays: number;
};

export function LeaveAllocationPanel({
  year,
  policies,
  members,
  balances,
}: {
  year: number;
  policies: LeavePolicyRow[];
  members: LeaveAllocMember[];
  balances: LeaveAllocBalance[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [allocateKey, setAllocateKey] = useState(0);

  const policyMap = new Map(policies.map((p) => [p.leaveType, p.defaultDays]));

  function onPolicy(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await upsertLeavePolicyAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Leave policy saved.");
      router.refresh();
    });
  }

  function onAllocate(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await setLeaveBalanceAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Leave balance updated.");
      setAllocateKey((key) => key + 1);
      router.refresh();
    });
  }

  return (
    <>
      <HrFeedbackBanner message={message} isError={isError} />
      <div className="ws-hr-split">
      <section className="ws-hr-panel">
        <h2>Leave policy ({year})</h2>
        <p className="ws-hr-help">
          Default days seeded for new employees. Existing balances are not
          overwritten.
        </p>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Default days</th>
                <th>Save</th>
              </tr>
            </thead>
            <tbody>
              {LEAVE_TYPES.map((leaveType) => (
                <tr key={leaveType}>
                  <td>
                    <span className="ws-leave-type-pill">
                      {leaveTypeShort(leaveType)}
                    </span>{" "}
                    {leaveTypeLabel(leaveType)}
                  </td>
                  <td colSpan={2}>
                    <form action={onPolicy} className="ws-hr-inline-form">
                      <input type="hidden" name="leaveType" value={leaveType} />
                      <input type="hidden" name="year" value={year} />
                      <input
                        name="defaultDays"
                        type="number"
                        min={0}
                        step={0.5}
                        defaultValue={policyMap.get(leaveType) ?? 0}
                        required
                        aria-label={`${leaveType} default days`}
                      />
                      <button
                        type="submit"
                        className="btn-cta btn-secondary btn-compact"
                        disabled={pending}
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ws-hr-panel">
        <h2>Allocate leave</h2>
        <p className="ws-hr-help">
          Set an employee&apos;s yearly balance for a leave type.
        </p>
        <form key={allocateKey} action={onAllocate} className="ws-hr-form">
          <label>
            Employee
            <select name="userId" required defaultValue="">
              <option value="" disabled>
                Select employee
              </option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select name="leaveType" defaultValue="CASUAL" required>
              {LEAVE_TYPES.map((leaveType) => (
                <option key={leaveType} value={leaveType}>
                  {leaveTypeShort(leaveType)} — {leaveTypeLabel(leaveType)}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="year" value={year} />
          <label>
            Balance days
            <input
              name="balanceDays"
              type="number"
              min={0}
              step={0.5}
              required
              placeholder="e.g. 12"
            />
          </label>
          <button type="submit" className="btn-cta btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Update balance"}
          </button>
        </form>

        {balances.length > 0 ? (
          <div className="ws-hr-table-wrap" style={{ marginTop: "1rem" }}>
            <table className="ws-hr-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Used</th>
                </tr>
              </thead>
              <tbody>
                {balances.slice(0, 40).map((row) => {
                  const member = members.find((m) => m.userId === row.userId);
                  return (
                    <tr key={`${row.userId}-${row.leaveType}`}>
                      <td>{member?.name ?? row.userId}</td>
                      <td>{leaveTypeShort(row.leaveType)}</td>
                      <td>{row.balanceDays}</td>
                      <td>{row.usedDays}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
      </div>
    </>
  );
}
