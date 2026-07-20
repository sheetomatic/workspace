import { CrmClientGroups, type CrmClientGroup } from "@/components/saas/crm-client-groups";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import {
  getCrmMeetingsStats,
  listCrmMeetings,
} from "@/lib/leads/crm-module-stats";
import {
  followUpTypeLabel,
  followUpTypeToNurtureEvent,
} from "@/lib/leads/follow-up-types";
import { leadStatusLabel } from "@/lib/leads/status-labels";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

export default async function CrmMeetingsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const [stats, rows] = await Promise.all([
    getCrmMeetingsStats(user.organizationId),
    listCrmMeetings(user.organizationId, 150),
  ]);
  const now = Date.now();

  const byLead = new Map<
    string,
    {
      lead: (typeof rows)[number]["lead"];
      meetings: typeof rows;
    }
  >();
  for (const row of rows) {
    const existing = byLead.get(row.lead.id);
    if (existing) {
      existing.meetings.push(row);
    } else {
      byLead.set(row.lead.id, { lead: row.lead, meetings: [row] });
    }
  }

  const groups: CrmClientGroup[] = [...byLead.values()].map((entry) => {
    const name = entry.lead.name || entry.lead.company || "Lead";
    let upcoming = 0;
    let overdue = 0;
    for (const row of entry.meetings) {
      if (row.completedAt) continue;
      const ts = new Date(row.scheduledAt).getTime();
      if (ts < now) overdue += 1;
      else upcoming += 1;
    }
    const summaryParts: string[] = [];
    if (upcoming) summaryParts.push(`${upcoming} upcoming`);
    if (overdue) summaryParts.push(`${overdue} overdue`);
    if (!summaryParts.length) {
      summaryParts.push(
        `${entry.meetings.length} meeting${entry.meetings.length === 1 ? "" : "s"}`,
      );
    }

    const openRow =
      entry.meetings.find((row) => !row.completedAt) ?? entry.meetings[0];
    const waEvent = openRow
      ? followUpTypeToNurtureEvent(openRow.type)
      : "stage_schedule_meeting";

    return {
      id: entry.lead.id,
      name,
      phone: entry.lead.phone || "",
      inboundLeadId: entry.lead.id,
      summary: summaryParts.join(" · "),
      meta: leadStatusLabel(entry.lead.status),
      waEvent,
      rows: entry.meetings.map((row) => {
        const ts = new Date(row.scheduledAt).getTime();
        const state = row.completedAt
          ? "Done"
          : ts < now
            ? "Overdue"
            : "Upcoming";
        return {
          id: row.id,
          cells: [
            {
              primary: new Date(row.scheduledAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }),
              secondary: state,
            },
            {
              primary: followUpTypeLabel(row.type),
              pill: true,
            },
            row.assignee?.name || row.assignee?.email || "—",
            row.notes?.trim() || "—",
          ],
        };
      }),
    };
  });

  return (
    <CrmSubmoduleShell
      title="Meetings"
      description="Meetings and typed follow-ups (Lead, Quotation, Negotiation, Payment) across CRM."
      kpis={[
        { label: "Open", value: String(stats.total), accent: "blue" },
        { label: "Today", value: String(stats.today) },
        { label: "Upcoming", value: String(stats.upcoming), accent: "success" },
        { label: "Overdue", value: String(stats.overdue), accent: "danger" },
      ]}
    >
      <CrmClientGroups
        groups={groups}
        columns={["When", "Type", "Assignee", "Notes"]}
        openTab="meeting"
        waEvent="stage_schedule_meeting"
        canManage={canManage}
        emptyMessage="No meetings or follow-ups scheduled yet."
        filterPlaceholder="Filter meeting clients…"
      />
    </CrmSubmoduleShell>
  );
}
