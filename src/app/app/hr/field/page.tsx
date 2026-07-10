import { PageHeader } from "@/components/saas/page-header";
import { GeoPunchForm } from "@/components/hr/geo-punch-form";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { FieldLiveBoard } from "@/components/hr/field-live-board";
import { FieldDayTrail } from "@/components/hr/field-day-trail";
import { FieldLivePinger } from "@/components/hr/field-live-pinger";
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
import {
  listMyDayTrail,
  listTodayPings,
} from "@/lib/hr/field-pings";
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

  const [checkIns, visits, members, todayPings, myPingTrail] = await Promise.all([
    listFieldCheckIns(user.organizationId, 80),
    listFieldVisits(user.organizationId),
    isManager ? listAssignableMembers(user.organizationId) : Promise.resolve([]),
    isManager
      ? listTodayPings(user.organizationId)
      : Promise.resolve([]),
    listMyDayTrail(user.organizationId, user.id),
  ]);

  const todayCheckIns = checkIns.filter(
    (row) => row.checkedInAt.getTime() >= todayStart.getTime(),
  );

  // Latest live ping per user (manager board).
  const latestPingByUser = new Map<
    string,
    {
      userId: string;
      name: string;
      checkedInAt: Date;
      geoLat: number;
      geoLng: number;
    }
  >();
  for (const ping of todayPings) {
    if (latestPingByUser.has(ping.userId)) continue;
    latestPingByUser.set(ping.userId, {
      userId: ping.userId,
      name: ping.user.name ?? ping.user.email,
      checkedInAt: ping.recordedAt,
      geoLat: ping.geoLat,
      geoLng: ping.geoLng,
    });
  }

  // Visit check-in aggregates for today.
  const checkInAgg = new Map<
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
    const existing = checkInAgg.get(row.userId);
    if (!existing) {
      checkInAgg.set(row.userId, {
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

  const allUserIds = new Set([
    ...latestPingByUser.keys(),
    ...checkInAgg.keys(),
  ]);

  const livePings = [...allUserIds]
    .map((userId) => {
      const ping = latestPingByUser.get(userId);
      const check = checkInAgg.get(userId);
      // Prefer live ping timestamp when newer; else last check-in.
      const usePing =
        ping &&
        (!check || ping.checkedInAt.getTime() >= check.checkedInAt.getTime());
      const source = usePing ? ping! : check!;
      return {
        userId,
        name: source.name,
        checkedInAt: source.checkedInAt,
        clientName: usePing ? null : (check?.clientName ?? null),
        geoLat: source.geoLat,
        geoLng: source.geoLng,
        checkInCount: check?.checkInCount ?? 0,
        openVisits: openVisitsByUser.get(userId) ?? 0,
        isLivePing: Boolean(usePing),
      };
    })
    .sort((a, b) => b.checkedInAt.getTime() - a.checkedInAt.getTime());

  // STAFF: only own check-ins (lat/lng privacy). MANAGER+: full team list.
  const recentCheckIns = isManager
    ? checkIns
    : checkIns.filter((row) => row.userId === user.id);

  const myCheckInTrail = todayCheckIns
    .filter((row) => row.userId === user.id)
    .map((row) => ({
      id: row.id,
      checkedInAt: row.checkedInAt,
      clientName: row.clientName ?? row.visit?.clientName ?? null,
      activityNote: row.activityNote,
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      isLivePing: false as const,
    }));

  const myLiveTrail = myPingTrail.map((p) => ({
    id: p.id,
    checkedInAt: p.recordedAt,
    clientName: null as string | null,
    activityNote: null as string | null,
    geoLat: p.geoLat,
    geoLng: p.geoLng,
    isLivePing: true as const,
  }));

  const myTodayTrail = [...myCheckInTrail, ...myLiveTrail].sort(
    (a, b) =>
      new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime(),
  );

  const trailUserId =
    isManager && livePings[0] && livePings[0].userId !== user.id
      ? livePings[0].userId
      : user.id;
  const trailName =
    trailUserId === user.id
      ? "My day trail"
      : `Day trail — ${livePings.find((p) => p.userId === trailUserId)?.name ?? "executive"}`;

  let managerTrail: typeof myTodayTrail = [];
  if (isManager && trailUserId !== user.id) {
    const [peerPings, peerChecks] = await Promise.all([
      listMyDayTrail(user.organizationId, trailUserId),
      Promise.resolve(
        todayCheckIns.filter((row) => row.userId === trailUserId),
      ),
    ]);
    managerTrail = [
      ...peerChecks.map((row) => ({
        id: row.id,
        checkedInAt: row.checkedInAt,
        clientName: row.clientName ?? row.visit?.clientName ?? null,
        activityNote: row.activityNote,
        geoLat: row.geoLat,
        geoLng: row.geoLng,
        isLivePing: false as const,
      })),
      ...peerPings.map((p) => ({
        id: p.id,
        checkedInAt: p.recordedAt,
        clientName: null as string | null,
        activityNote: null as string | null,
        geoLat: p.geoLat,
        geoLng: p.geoLng,
        isLivePing: true as const,
      })),
    ].sort(
      (a, b) =>
        new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime(),
    );
  }

  const myOpenVisits = visits
    .filter(
      (v) =>
        v.assigneeUserId === user.id &&
        (v.status === "PLANNED" || v.status === "IN_PROGRESS"),
    )
    .map((v) => ({
      id: v.id,
      clientName: v.clientName,
      locationLabel: v.locationLabel,
      status: v.status,
      geofence:
        v.geoLat != null && v.geoLng != null && v.radiusM != null && v.radiusM > 0
          ? {
              geoLat: v.geoLat,
              geoLng: v.geoLng,
              geoFenceRadiusM: v.radiusM,
            }
          : null,
    }));

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

      <FieldLivePinger enabled />

      {isManager ? <FieldLiveBoard pings={livePings} /> : null}

      <div className="ws-hr-split">
        <section className="ws-hr-panel">
          <h2>Field check-in</h2>
          <GeoPunchForm
            action={recordFieldCheckInAction}
            submitLabel="Save field check-in"
            requireGeo
            successMessage="Field check-in saved."
            visits={myOpenVisits}
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
                Geofence latitude (optional)
                <input
                  name="geoLat"
                  type="number"
                  step="any"
                  placeholder="e.g. 19.0760"
                />
              </label>
              <label>
                Geofence longitude (optional)
                <input
                  name="geoLng"
                  type="number"
                  step="any"
                  placeholder="e.g. 72.8777"
                />
              </label>
              <label>
                Geofence radius (metres)
                <input
                  name="radiusM"
                  type="number"
                  min={50}
                  max={5000}
                  defaultValue={200}
                />
              </label>
              <p className="ws-hr-help">
                If lat/lng are set, check-in against this visit must be inside
                the radius.
              </p>
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
                  <th>Geofence</th>
                  <th>Status</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No visits planned.</td>
                  </tr>
                ) : (
                  visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.assignee.name ?? visit.assignee.email}</td>
                      <td>{visit.clientName}</td>
                      <td>{visit.locationLabel ?? "-"}</td>
                      <td>
                        {visit.geoLat != null &&
                        visit.geoLng != null &&
                        visit.radiusM != null
                          ? `${visit.radiusM}m @ ${visit.geoLat.toFixed(4)}, ${visit.geoLng.toFixed(4)}`
                          : "—"}
                      </td>
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
