import { CrmMeetingsCalendar } from "@/components/saas/crm-meetings-calendar";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import {
  getCrmMeetingsStats,
  listCrmMeetings,
} from "@/lib/leads/crm-module-stats";
import {
  isIstToday,
  istYmd,
  resolveFollowUpMeetUrl,
} from "@/lib/leads/crm-meetings";
import { followUpTypeLabel } from "@/lib/leads/follow-up-types";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { requireCrmSubModule } from "@/lib/crm/crm-access";

export default async function CrmMeetingsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "meetings");
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const [stats, rows] = await Promise.all([
    getCrmMeetingsStats(user.organizationId),
    listCrmMeetings(user.organizationId, 200),
  ]);

  const meetings = rows.map((row) => {
    const scheduledAt = new Date(row.scheduledAt);
    return {
      id: row.id,
      leadId: row.lead.id,
      name: row.lead.name || row.lead.company || "Lead",
      phone: row.lead.phone || "",
      whenLabel: scheduledAt.toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      }),
      ymd: istYmd(scheduledAt),
      typeLabel: followUpTypeLabel(row.type),
      assignee: row.assignee?.name || row.assignee?.email || "",
      meetUrl: resolveFollowUpMeetUrl(row.meetUrl, row.notes),
      notes: row.notes?.trim() || row.lead.meetingNotes?.trim() || "",
      isToday: isIstToday(scheduledAt),
    };
  });

  return (
    <CrmSubmoduleShell
      title="Meetings"
      description="Upcoming meetings in IST. Rows stay collapsed — expand to edit the Meet link. Auto WhatsApp reminders still run; use Remind to send one now."
      kpis={[
        { label: "Today", value: String(stats.today), accent: "blue" },
        { label: "This week", value: String(stats.week) },
        { label: "Upcoming", value: String(stats.upcoming), accent: "success" },
      ]}
    >
      <CrmMeetingsCalendar meetings={meetings} canManage={canManage} />
    </CrmSubmoduleShell>
  );
}
