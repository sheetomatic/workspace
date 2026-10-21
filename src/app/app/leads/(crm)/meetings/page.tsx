import { CrmMeetingsCalendar } from "@/components/saas/crm-meetings-calendar";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { listCrmMeetings } from "@/lib/leads/crm-module-stats";
import {
  countCrmMeetings,
  isIstToday,
  istYmd,
  parseCrmMeetingView,
  resolveFollowUpMeetUrl,
} from "@/lib/leads/crm-meetings";
import { followUpTypeLabel } from "@/lib/leads/follow-up-types";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { syncGoogleCalendarAppointments } from "@/lib/leads/google-calendar-appointments";

export default async function CrmMeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "meetings");
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const params = await searchParams;
  const view = parseCrmMeetingView(params.view);
  const selectedDate = params.date?.trim() || null;
  const calendarSync = await syncGoogleCalendarAppointments(user.organizationId).catch(() => null);
  const rows = await listCrmMeetings(user.organizationId);

  const meetings = rows.map((row) => {
    const scheduledAt = new Date(row.scheduledAt);
    const completed = Boolean(row.completedAt);
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
      typeLabel: completed ? "Done" : followUpTypeLabel(row.type),
      assignee: row.assignee?.name || row.assignee?.email || "",
      meetUrl: resolveFollowUpMeetUrl(row.meetUrl, row.notes),
      notes: row.notes?.trim() || row.lead.meetingNotes?.trim() || "",
      isToday: isIstToday(scheduledAt),
      completed,
      externalSource: row.externalSource,
      externalUrl: row.externalUrl,
    };
  });

  const stats = countCrmMeetings(meetings);

  return (
    <CrmSubmoduleShell
      title="Meetings"
      description={calendarSync?.configured
        ? "Google Calendar appointments sync here automatically. Open a meeting to view details; Join appears when Google provides a meeting link."
        : "Click a number to see that list. Calendar appointments appear after the Google Calendar connection is configured."}
      kpis={[
        {
          label: "Today",
          value: String(stats.today),
          accent: "blue",
          href: "/app/leads/meetings?view=today",
          active: view === "today",
        },
        {
          label: "This week",
          value: String(stats.week),
          href: "/app/leads/meetings?view=week",
          active: view === "week",
        },
        {
          label: "This month",
          value: String(stats.month),
          href: "/app/leads/meetings?view=month",
          active: view === "month",
        },
        {
          label: "Upcoming",
          value: String(stats.upcoming),
          accent: "success",
          href: "/app/leads/meetings?view=upcoming",
          active: view === "upcoming",
        },
        {
          label: "Done",
          value: String(stats.done),
          href: "/app/leads/meetings?view=done",
          active: view === "done",
        },
      ]}
    >
      <CrmMeetingsCalendar
        meetings={meetings}
        canManage={canManage}
        view={view}
        selectedDate={selectedDate}
      />
    </CrmSubmoduleShell>
  );
}
