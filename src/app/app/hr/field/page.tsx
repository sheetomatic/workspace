import { PageHeader } from "@/components/saas/page-header";
import { GeoPunchForm } from "@/components/hr/geo-punch-form";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { FieldLiveBoard } from "@/components/hr/field-live-board";
import { FieldDayTrail } from "@/components/hr/field-day-trail";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listAssignableMembers } from "@/lib/tasks";
import {
  listFieldCheckIns,
  listFieldVisits,
} from "@/lib/hr/hr-store";
import {
  createFieldVisitAction,
  recordFieldCheckInAction,
} from "@/lib/hr/hr-actions";
import { fieldTrackingModule } from "@/app/hr-module-content";

function startOfTodayIst() {
  const ymd = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  return new Date(`${ymd}T00:00:00+05:30`);
}

export default async function HrFieldPage() {
  const user = await requireSession(undefined, { module: "HR" });
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const todayStart = startOfTodayIst();

  const [checkIns, visits, members] = await Promise.all([
    listFieldCheckIns(user.organizationId, 80),
    listFieldVisits(user.organizationId),
    isManager ? listAssignableMembers(user.organizationId) : Promise.resolve([]),
  ]);

  const todayCheckIns = checkIns.filter(
    (row) => row.checkedInAt.getTime() >= todayStart.getTime(),
  );

  const liveByUser = new Map<
    string,
    {
      userId: string;
      name: string;
      checkedInAt: Date;
      clientName: string | null;
      geoLat: number;
      geoLng: number;
      checkInCount: number;
    }
  >();

  for (const row of todayCheckIns) {
    const existing = liveByUser.get(row.userId);
    if (!existing) {
      liveByUser.set(row.userId, {
        userId: row.userId,
        name: row.user.name ?? row.user.email,
        checkedInAt: row.checkedInAt,
        clientName: row.clientName ?? row.visit?.clientName ?? null,
        geoLat: row.geoLat,
        geoLng: row.geoLng,
        checkInCount: 1,
      });
    } else {
      existing.checkInCount += 1;
      if (row.checkedInAt > existing.checkedInAt) {
        existing.checkedInAt = row.checkedInAt;
        existing.clientName = row.clientName ?? row.visit?.clientName ?? null;
        existing.geoLat = row.geoLat;
        existing.geoLng = row.geoLng;
      }
    }
  }

  const openVisitsByUser = new Map<string, number>();
  for (const visit of visits) {
    if (visit.status === "PLANNED" || visit.status === "IN_PROGRESS") {
      openVisitsByUser.set(
        visit.assigneeUserId,
        (openVisitsByUser.get(visit.assigneeUserId) ?? 0) + 1,
      );
    }
  }

  const livePings = [...liveByUser.values()]
    .map((ping) => ({
      ...ping,
      openVisits: openVisitsByUser.get(ping.userId) ?? 0,
    }))
    .sort((a, b) => b.checkedInAt.getTime() - a.checkedInAt.getTime());

  // STAFF: only own check-ins (lat/lng privacy). MANAGER+: full team list.
  const recentCheckIns = isManager
    ? checkIns
    : checkIns.filter((row) => row.userId === user.id);

  const myTodayTrail = todayCheckIns
    .filter((row) => row.userId === user.id)
    .slice()
    .sort((a, b) => a.checkedInAt.getTime() - b.checkedInAt.getTime())
    .map((row) => ({
      id: row.id,
      checkedInAt: row.checkedInAt,
      clientName: row.clientName ?? row.visit?.clientName ?? null,
      activityNote: row.activityNote,
      geoLat: row.geoLat,
      geoLng: row.geoLng,
    }));

  const trailUserId =
    isManager && livePings[0] && livePings[0].userId !== user.id
      ? livePings[0].userId
      : user.id;
  const trailName =
    trailUserId === user.id
      ? "My day trail"
      : `Day trail — ${liveByUser.get(trailUserId)?.name ?? "executive"}`;
  const managerTrail =
    isManager && trailUserId !== user.id
      ? todayCheckIns
          .filter((row) => row.userId === trailUserId)
          .slice()
          .sort((a, b) => a.checkedInAt.getTime() - b.checkedInAt.getTime())
          .map((row) => ({
            id: row.id,
            checkedInAt: row.checkedInAt,
            clientName: row.clientName ?? row.visit?.clientName ?? null,
            activityNote: row.activityNote,
            geoLat: row.geoLat,
            geoLng: row.geoLng,
          }))
      : [];

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Field executive tracking"
        description={fieldTrackingModule.tagline}
      />
      <HrSubNav activePath="/app/hr/field" isAdmin={hasMinimumRole(user.role, "ADMIN")} />

      <p className="ws-hr-note">
        Separate from office attendance. Use this module for sales, service, and
        collection teams checking in at client locations.
      </p>

      {isManager ? <FieldLiveBoard pings={livePings} /> : null}

      <div className="ws-hr-split">
        <section className="ws-hr-panel">
          <h2>Field check-in</h2>
          <GeoPunchForm
            action={recordFieldCheckInAction}
            submitLabel="Save field check-in"
            requireGeo
            successMessage="Field check-in saved."
          >
            <label>
              Client / site name
              <input name="clientName" type="text" placeholder="e.g. Sharma Traders" />
            </label>
            <label>
              Activity note
              <textarea
                name="activityNote"
                rows={3}
                placeholder="Visit purpose, order taken, collection, etc."
              />
            </label>
          </GeoPunchForm>
        </section>

        {isManager ? (
          <section className="ws-hr-panel">
            <h2>Plan a visit</h2>
            <form action={createFieldVisitAction} className="ws-hr-form">
              <label>
                Assign to
                <select name="assigneeUserId" required defaultValue="">
                  <option value="" disabled>
                    Select team member
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Client name
                <input name="clientName" type="text" required />
              </label>
              <label>
                Location label
                <input name="locationLabel" type="text" placeholder="Area / city" />
              </label>
              <label>
                Purpose
                <textarea name="purpose" rows={2} />
              </label>
              <button type="submit" className="btn-cta btn-primary">
                Plan visit
              </button>
            </form>
          </section>
        ) : null}
      </div>

      <FieldDayTrail title="My day trail" points={myTodayTrail} />
      {isManager && managerTrail.length > 0 ? (
        <FieldDayTrail title={trailName} points={managerTrail} />
      ) : null}

      <section className="ws-hr-panel">
        <h2>
          {isManager ? "Recent field check-ins" : "My recent field check-ins"}
        </h2>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                <th>Time</th>
                {isManager ? <th>Executive</th> : null}
                <th>Client</th>
                <th>Location</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {recentCheckIns.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 5 : 4}>No field check-ins yet.</td>
                </tr>
              ) : (
                recentCheckIns.map((row) => (
                  <tr key={row.id}>
                    <td>{row.checkedInAt.toLocaleString()}</td>
                    {isManager ? (
                      <td>{row.user.name ?? row.user.email}</td>
                    ) : null}
                    <td>{row.clientName ?? row.visit?.clientName ?? "-"}</td>
                    <td>
                      {row.geoLat.toFixed(4)}, {row.geoLng.toFixed(4)}
                    </td>
                    <td>{row.activityNote ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isManager ? (
        <section className="ws-hr-panel">
          <h2>Planned visits</h2>
          <div className="ws-hr-table-wrap">
            <table className="ws-hr-table">
              <thead>
                <tr>
                  <th>Assignee</th>
                  <th>Client</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No visits planned.</td>
                  </tr>
                ) : (
                  visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.assignee.name ?? visit.assignee.email}</td>
                      <td>{visit.clientName}</td>
                      <td>{visit.locationLabel ?? "-"}</td>
                      <td>{visit.status}</td>
                      <td>{visit.purpose ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
