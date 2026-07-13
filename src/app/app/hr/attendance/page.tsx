import { PageHeader } from "@/components/saas/page-header";
import { WorkspaceGuideButton } from "@/components/saas/workspace-guide-button";
import { AttendancePunchPanel } from "@/components/hr/attendance-punch-panel";
import { AttendanceAdminTable } from "@/components/hr/attendance-admin-table";
import { AttendanceSiteToolbar } from "@/components/hr/attendance-site-toolbar";
import { AttendanceMonthCalendar } from "@/components/hr/attendance-month-calendar";
import { MarkAttendanceDayForm } from "@/components/hr/mark-attendance-day-form";
import { AttendanceVerifyQueue } from "@/components/hr/attendance-verify-queue";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import {
  listPendingAttendanceVerifications,
  listTodayAttendance,
} from "@/lib/hr/hr-store";
import { listAttendanceForPeriod } from "@/lib/hr/payroll";
import {
  getAttendanceSiteStats,
  listActiveHrWorkSites,
} from "@/lib/hr/sites";
import { listHolidays } from "@/lib/hr/holidays";
import { prisma } from "@/lib/db";
import { attendanceLeaveModule } from "@/app/hr-module-content";

type PageProps = {
  searchParams: Promise<{ site?: string; month?: string }>;
};

function startOfToday(timeZone = "Asia/Kolkata") {
  const formatted = new Date().toLocaleDateString("en-CA", { timeZone });
  return new Date(`${formatted}T12:00:00.000Z`);
}

function parseMonthParam(raw: string | undefined) {
  const now = new Date();
  const fallback = {
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  };
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) {
    return fallback;
  }
  const [y, m] = raw.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    return fallback;
  }
  return { year: y, monthIndex: m - 1 };
}

export default async function HrAttendancePage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "HR" });
  const params = await searchParams;
  const siteFilter = params.site?.trim() || null;
  const workDate = startOfToday();
  const { year, monthIndex } = parseMonthParam(params.month);
  const periodStart = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, monthIndex + 1, 0, 12, 0, 0, 0));
  const daysInMonth = periodEnd.getUTCDate();
  const canMark = hasMinimumRole(user.role, "MANAGER");
  const todayIso = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

  const [records, membership, hrSettings, sites, stats, monthRecords, members, yearHolidays, pendingVerify] =
    await Promise.all([
      listTodayAttendance(user.organizationId, siteFilter),
      prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: user.organizationId,
          },
        },
        select: { geoFenceRequired: true, locationMode: true },
      }),
      prisma.workspaceHrSettings.findUnique({
        where: { organizationId: user.organizationId },
        select: { officeLat: true, officeLng: true },
      }),
      listActiveHrWorkSites(user.organizationId),
      getAttendanceSiteStats(user.organizationId, workDate, siteFilter),
      listAttendanceForPeriod(user.organizationId, periodStart, periodEnd),
      prisma.membership.findMany({
        where: {
          organizationId: user.organizationId,
          deactivatedAt: null,
        },
        select: {
          userId: true,
          user: { select: { name: true, email: true } },
        },
        orderBy: { user: { name: "asc" } },
      }),
      listHolidays(user.organizationId, year),
      canMark
        ? listPendingAttendanceVerifications(user.organizationId)
        : Promise.resolve([]),
    ]);

  const myRecord = records.find((r) => r.userId === user.id);
  const officeConfigured =
    hrSettings?.officeLat != null && hrSettings?.officeLng != null;
  // FLEXIBLE never forces fence UI (matches server: optional GPS, never blocks).
  const isFlexible = membership?.locationMode === "FLEXIBLE";
  const geoFenceRequired =
    !isFlexible &&
    (membership?.geoFenceRequired === true ||
      sites.length > 0 ||
      officeConfigured);

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const siteOptions = sites.map((site) => ({ id: site.id, name: site.name }));

  const employees = members.map((m) => ({
    userId: m.userId,
    name: m.user.name ?? m.user.email ?? "Unknown",
  }));

  const filteredMonth = siteFilter
    ? monthRecords.filter((row) => !row.siteId || row.siteId === siteFilter)
    : monthRecords;

  const monthCells = filteredMonth.map((row) => ({
    userId: row.userId,
    day: new Date(row.workDate).getUTCDate(),
    status: row.status,
    notes: row.notes,
    verifyStatus: row.verifyStatus,
    otHours: row.otHours,
    isLate: row.isLate,
  }));

  const monthHolidays = yearHolidays
    .filter((h) => {
      const d = new Date(h.date);
      return d.getUTCFullYear() === year && d.getUTCMonth() === monthIndex;
    })
    .map((h) => ({
      day: new Date(h.date).getUTCDate(),
      name: h.name,
      isOptional: h.isOptional,
    }));

  return (
    <div className="saas-page ws-hr-page ws-attendance-page">
      <PageHeader
        title="Attendance"
        description={attendanceLeaveModule.tagline}
        actions={<WorkspaceGuideButton guideId="hr-attendance" />}
      />
      <HrSubNav activePath="/app/hr/attendance" isAdmin={hasMinimumRole(user.role, "ADMIN")} />

      <AttendanceSiteToolbar
        activeSiteId={siteFilter}
        month={monthKey}
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
        verifyStatus={myRecord?.verifyStatus ?? null}
        isLate={myRecord?.isLate ?? false}
        otHours={myRecord?.otHours ?? 0}
      />

      {canMark ? (
        <AttendanceVerifyQueue
          rows={pendingVerify.map((row) => ({
            id: row.id,
            employeeName: row.user.name ?? row.user.email ?? "Unknown",
            workDate: new Date(row.workDate).toISOString().slice(0, 10),
            checkInAt: row.checkInAt?.toISOString() ?? null,
            isLate: row.isLate,
            otHours: row.otHours ?? 0,
            siteName: row.site?.name ?? null,
            status: row.status,
          }))}
        />
      ) : null}

      {canMark ? (
        <MarkAttendanceDayForm
          defaultDate={todayIso}
          employees={employees}
        />
      ) : null}

      <AttendanceMonthCalendar
        cells={monthCells}
        daysInMonth={daysInMonth}
        employees={employees}
        holidays={monthHolidays}
        monthIndex={monthIndex}
        siteId={siteFilter}
        year={year}
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
          status: row.status,
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
