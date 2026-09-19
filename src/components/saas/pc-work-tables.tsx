import Link from "next/link";
import type { PcWorkItem } from "@/lib/checklists/pc-work";
import { formatDeficitPct } from "@/lib/mis/reports-data";

function kindLabel(kind: PcWorkItem["kind"]) {
  if (kind === "CHECKLIST") {
    return "PC checklist";
  }
  if (kind === "EA_TASK") {
    return "EA task";
  }
  return "FMS step";
}

export function PcWorkQueueTable({
  items,
  emptyMessage,
}: {
  items: PcWorkItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="ws-empty-state ws-fms-empty-state is-positive">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="ws-sf-table-wrap">
      <table className="ws-fms-data-table ws-sf-data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Work item</th>
            <th>Doer</th>
            <th>Due</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.kind}-${item.id}`} className={item.overdue ? "is-overdue" : undefined}>
              <td>{kindLabel(item.kind)}</td>
              <td>
                <strong>{item.title}</strong>
                <p className="ws-fms-muted">{item.subtitle}</p>
              </td>
              <td>{item.owner}</td>
              <td>{item.dueLabel}</td>
              <td>{item.status}</td>
              <td>
                <Link href={item.href} className="btn-secondary btn-sm">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PcPersonMisTable({ rows }: { rows: Array<{
  owner: string;
  total: number;
  pending: number;
  overdue: number;
  doneLate: number;
  deficitPct: number;
}> }) {
  if (rows.length === 0) {
    return (
      <div className="ws-empty-state">
        <p>No PC performance data yet.</p>
      </div>
    );
  }

  return (
    <div className="ws-sf-table-wrap ws-mis-table-scroll">
      <table className="ws-fms-data-table ws-sf-data-table ws-mis-score-table">
        <thead>
          <tr>
            <th>Doer</th>
            <th>Items</th>
            <th>Pending</th>
            <th>Overdue</th>
            <th>Done late</th>
            <th>Deficit %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.owner} className={row.deficitPct > 0 ? "is-overdue" : undefined}>
              <td data-label="Doer">{row.owner}</td>
              <td data-label="Items">{row.total}</td>
              <td data-label="Pending">{row.pending}</td>
              <td data-label="Overdue">{row.overdue}</td>
              <td data-label="Done late">{row.doneLate}</td>
              <td data-label="Deficit %">
                <span className={`ws-mis-deficit-value${row.deficitPct > 0 ? " is-negative" : ""}`}>
                  {formatDeficitPct(row.deficitPct)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const EXCEPTION_LABELS = {
  overdue: "Overdue",
  pending: "Pending",
  doneLate: "Done late",
} as const;

export function PcExceptionTable({
  rows,
}: {
  rows: Array<{
    id: string;
    title: string;
    owner: string;
    kind: keyof typeof EXCEPTION_LABELS;
    status: string;
    href: string;
  }>;
}) {
  if (rows.length === 0) {
    return (
      <div className="ws-empty-state ws-fms-empty-state is-positive">
        <p>No overdue, pending, or done-late checklist items in this window.</p>
      </div>
    );
  }

  return (
    <div className="ws-sf-table-wrap">
      <table className="ws-fms-data-table ws-sf-data-table">
        <thead>
          <tr>
            <th>Exception</th>
            <th>Task</th>
            <th>Doer</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.kind === "overdue" ? "is-overdue" : undefined}>
              <td data-label="Exception">{EXCEPTION_LABELS[row.kind]}</td>
              <td data-label="Task">
                <strong>{row.title}</strong>
              </td>
              <td data-label="Doer">{row.owner}</td>
              <td data-label="Open">
                <Link href={row.href} className="btn-secondary btn-sm">
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
