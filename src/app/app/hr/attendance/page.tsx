import { PageHeader } from "@/components/saas/page-header";
import { AttendancePunchPanel } from "@/components/hr/attendance-punch-panel";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { listTodayAttendance } from "@/lib/hr/hr-store";
import { attendanceLeaveModule } from "@/app/hr-module-content";

export default async function HrAttendancePage() {
  const user = await requireSession();
  const records = await listTodayAttendance(user.organizationId);
  const myRecord = records.find((r) => r.userId === user.id);

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
        method={myRecord?.method ?? null}
        todayLabel={todayLabel}
      />

      <section className="ws-hr-panel">
        <h2>Today&apos;s attendance</h2>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Check in</th>
                <th>Check out</th>
                <th>Method</th>
                <th>Geo</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5}>No punches recorded today.</td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id}>
                    <td>{row.user.name ?? row.user.email}</td>
                    <td>
                      {row.checkInAt
                        ? row.checkInAt.toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td>
                      {row.checkOutAt
                        ? row.checkOutAt.toLocaleTimeString("en-IN", {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td>{row.method}</td>
                    <td>
                      {row.geoFenceOk == null
                        ? "-"
                        : row.geoFenceOk
                          ? "OK"
                          : "Outside"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="ws-hr-note">
        Workplace geo-fence and per-member attendance rules are configured under
        Team when you edit a member.
      </p>
    </div>
  );
}
