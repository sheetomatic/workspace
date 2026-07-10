const LEAVE_LABELS: Record<string, { short: string; label: string }> = {
  CASUAL: { short: "CL", label: "Casual leave" },
  SICK: { short: "SL", label: "Sick leave" },
  EARNED: { short: "EL", label: "Earned leave" },
  UNPAID: { short: "UL", label: "Unpaid leave" },
  COMP_OFF: { short: "CO", label: "Comp off" },
};

export type LeaveBalanceCard = {
  leaveType: string;
  balanceDays: number;
  usedDays: number;
};

export function LeaveBalanceCards({
  year,
  balances,
}: {
  year: number;
  balances: LeaveBalanceCard[];
}) {
  const visible = balances.filter((row) => {
    if (row.leaveType === "UNPAID") {
      return false;
    }
    return true;
  });

  return (
    <section className="ws-hr-panel ws-leave-balances" aria-label="Leave balances">
      <div className="ws-ims-panel-head">
        <h2>My leave balances</h2>
        <span className="ws-apple-cell-secondary">{year}</span>
      </div>
      <div className="ws-leave-balance-grid">
        {visible.map((row) => {
          const meta = LEAVE_LABELS[row.leaveType] ?? {
            short: row.leaveType.slice(0, 2),
            label: row.leaveType,
          };
          const remaining = Math.max(0, row.balanceDays - row.usedDays);
          return (
            <article
              key={row.leaveType}
              className={`ws-leave-balance-card tone-${row.leaveType.toLowerCase()}`}
            >
              <span className="ws-leave-balance-code">{meta.short}</span>
              <strong>{remaining}</strong>
              <span className="ws-leave-balance-label">{meta.label}</span>
              <span className="ws-leave-balance-meta">
                {row.usedDays} used of {row.balanceDays}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function leaveTypeLabel(leaveType: string) {
  return LEAVE_LABELS[leaveType]?.label ?? leaveType;
}

export function leaveTypeShort(leaveType: string) {
  return LEAVE_LABELS[leaveType]?.short ?? leaveType;
}
