import Link from "next/link";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import {
  getCrmMeetingsStats,
  listCrmMeetings,
} from "@/lib/leads/crm-module-stats";
import { leadStatusLabel } from "@/lib/leads/status-labels";
import { requireSession } from "@/lib/require-session";

export default async function CrmMeetingsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const [stats, rows] = await Promise.all([
    getCrmMeetingsStats(user.organizationId),
    listCrmMeetings(user.organizationId, 150),
  ]);
  const now = Date.now();

  return (
    <CrmSubmoduleShell
      title="Meetings"
      description="Time-wise scheduled meetings and follow-ups across CRM."
      kpis={[
        { label: "Open", value: String(stats.total), accent: "blue" },
        { label: "Today", value: String(stats.today) },
        { label: "Upcoming", value: String(stats.upcoming), accent: "success" },
        { label: "Overdue", value: String(stats.overdue), accent: "danger" },
      ]}
    >
      <div className="crm-submodule-table-wrap">
        <table className="crm-submodule-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Client</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Notes</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="leads-machine-muted">
                  No meetings scheduled yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const ts = new Date(row.scheduledAt).getTime();
                const state =
                  row.completedAt
                    ? "Done"
                    : ts < now
                      ? "Overdue"
                      : "Upcoming";
                return (
                  <tr key={row.id}>
                    <td>
                      {new Date(row.scheduledAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <div className="leads-machine-muted">{state}</div>
                    </td>
                    <td>
                      <strong>{row.lead.name || row.lead.company || "Lead"}</strong>
                      <div className="leads-machine-muted">
                        {row.lead.phone || "—"}
                      </div>
                    </td>
                    <td>{leadStatusLabel(row.lead.status)}</td>
                    <td>{row.assignee?.name || row.assignee?.email || "—"}</td>
                    <td>{row.notes?.trim() || "—"}</td>
                    <td>
                      <Link
                        className="btn-secondary btn-sm"
                        href={`/app/leads?leadId=${row.lead.id}&period=all`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </CrmSubmoduleShell>
  );
}
