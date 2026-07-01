import { PageHeader } from "@/components/saas/page-header";
import { AttendancePunchPanel } from "@/components/hr/attendance-punch-panel";
import { AttendanceAdminTable } from "@/components/hr/attendance-admin-table";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { listTodayAttendance } from "@/lib/hr/hr-store";
import { prisma } from "@/lib/db";
import { attendanceLeaveModule } from "@/app/hr-module-content";

export default async function HrAttendancePage() {
  const user = await requireSession(undefined, { module: "HR" });
  const [records, membership, hrSettings] = await Promise.all([
    listTodayAttendance(user.organizationId),
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
  ]);
  const myRecord = records.find((r) => r.userId === user.id);
  const officeConfigured =
    hrSettings?.officeLat != null && hrSettings?.officeLng != null;
  const geoFenceRequired =
    membership?.geoFenceRequired === true || officeConfigured;

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="saas-page ws-hr-page ws-attendance-page">
      <PageHeader
        title="Attendance"
        description={attendanceLeaveModule.tagline}
      />
      <HrSubNav activePath="/app/hr/attendance" />

      <AttendancePunchPanel
        checkInAt={myRecord?.checkInAt ?? null}
        checkOutAt={myRecord?.checkOutAt ?? null}
        geoFenceOk={myRecord?.geoFenceOk ?? null}
        geoFenceRequired={geoFenceRequired}
        method={myRecord?.method ?? null}
        todayLabel={todayLabel}
      />

      <AttendanceAdminTable
        canManage={user.isSuperAdmin}
        records={records.map((row) => ({
          id: row.id,
          employeeName: row.user.name ?? row.user.email ?? "Unknown",
          checkInAt: row.checkInAt?.toISOString() ?? null,
          checkOutAt: row.checkOutAt?.toISOString() ?? null,
          method: row.method,
          geoFenceOk: row.geoFenceOk,
          notes: row.notes,
        }))}
      />

      <p className="ws-hr-note">
        Workplace geo-fence and per-member attendance rules are configured under
        Team when you edit a member.
      </p>
    </div>
  );
}
