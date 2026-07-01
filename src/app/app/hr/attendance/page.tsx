import { PageHeader } from "@/components/saas/page-header";
import { AttendancePunchPanel } from "@/components/hr/attendance-punch-panel";
import { AttendanceAdminTable } from "@/components/hr/attendance-admin-table";
import { AttendanceSiteToolbar } from "@/components/hr/attendance-site-toolbar";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { listTodayAttendance } from "@/lib/hr/hr-store";
import {
  getAttendanceSiteStats,
  listActiveHrWorkSites,
} from "@/lib/hr/sites";
import { prisma } from "@/lib/db";
import { attendanceLeaveModule } from "@/app/hr-module-content";

type PageProps = {
  searchParams: Promise<{ site?: string }>;
};

function startOfToday(timeZone = "Asia/Kolkata") {
  const formatted = new Date().toLocaleDateString("en-CA", { timeZone });
  return new Date(`${formatted}T12:00:00.000Z`);
}

export default async function HrAttendancePage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "HR" });
  const params = await searchParams;
  const siteFilter = params.site?.trim() || null;
  const workDate = startOfToday();

  const [records, membership, hrSettings, sites, stats] = await Promise.all([
    listTodayAttendance(user.organizationId, siteFilter),
    prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: user.organizationId,
        },
      },
      select: { geoFenceRequired: true },
    }),
    prisma.workspaceHrSettings.findUnique({
      where: { organizationId: user.organizationId },
      select: { officeLat: true, officeLng: true },
    }),
    listActiveHrWorkSites(user.organizationId),
    getAttendanceSiteStats(user.organizationId, workDate, siteFilter),
  ]);

  const myRecord = records.find((r) => r.userId === user.id);
  const officeConfigured =
    hrSettings?.officeLat != null && hrSettings?.officeLng != null;
  const geoFenceRequired =
    membership?.geoFenceRequired === true ||
    sites.length > 0 ||
    officeConfigured;

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const siteOptions = sites.map((site) => ({ id: site.id, name: site.name }));

  return (
    <div className="saas-page ws-hr-page ws-attendance-page">
      <PageHeader
        title="Attendance"
        description={attendanceLeaveModule.tagline}
      />
      <HrSubNav activePath="/app/hr/attendance" />

      <AttendanceSiteToolbar
        activeSiteId={siteFilter}
        sites={siteOptions}
        stats={{
          present: stats.present,
          absent: stats.absent,
          onLeave: stats.onLeave,
        }}
      />

      <AttendancePunchPanel
        checkInAt={myRecord?.checkInAt ?? null}
        checkOutAt={myRecord?.checkOutAt ?? null}
        geoFenceOk={myRecord?.geoFenceOk ?? null}
        geoFenceRequired={geoFenceRequired}
        method={myRecord?.method ?? null}
        sites={siteOptions}
        todayLabel={todayLabel}
      />

      <AttendanceAdminTable
        canManage={user.isSuperAdmin}
        records={records.map((row) => ({
          id: row.id,
          employeeName: row.user.name ?? row.user.email ?? "Unknown",
          siteName: row.site?.name ?? "-",
          checkInAt: row.checkInAt?.toISOString() ?? null,
          checkOutAt: row.checkOutAt?.toISOString() ?? null,
          method: row.method,
          geoFenceOk: row.geoFenceOk,
          notes: row.notes,
        }))}
      />

      <p className="ws-hr-note">
        Workplace geo-fence and per-member attendance rules are configured under
        Team when you edit a member. Add multiple office locations under Team →
        Workplace attendance settings.
      </p>
    </div>
  );
}
