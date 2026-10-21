import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { GeoPunchForm } from "@/components/hr/geo-punch-form";
import { PlanFieldVisitForm } from "@/components/hr/plan-field-visit-form";
import { FieldProofUpload } from "@/components/hr/field-proof-upload";
import { FieldSubNav } from "@/components/hr/field-sub-nav";
import { FieldLiveBoard } from "@/components/hr/field-live-board";
import { FieldDistanceBoard } from "@/components/hr/field-distance-board";
import { FieldDayTrail } from "@/components/hr/field-day-trail";
import { FieldMapBoard } from "@/components/hr/field-map-board";
import { FieldMapSettings } from "@/components/hr/field-map-settings";
import { FieldLivePinger } from "@/components/hr/field-live-pinger";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listAssignableMembers } from "@/lib/tasks";
import {
  listFieldCheckIns,
  listFieldVisits,
} from "@/lib/hr/hr-store";
import { getEffectiveHrSubModulesForUser } from "@/lib/hr/hr-access";
import { FieldVisitStatusButton } from "@/components/hr/field-visit-status-button";
import {
  recordFieldCheckInAction,
  updateFieldVisitStatusAction,
} from "@/lib/hr/hr-actions";
import {
  listMyDayTrail,
  listTodayRecordedDistances,
  listTodayPings,
} from "@/lib/hr/field-pings";
import { fieldTrackingModule } from "@/app/hr-module-content";

function startOfTodayIst() {
  const ymd = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  return new Date(`${ymd}T00:00:00+05:30`);
}

export default async function FieldTrackingPage() {
  const user = await requireSession(undefined, { module: "HR" });
  const { allowed, settings: hrSettings } =
    await getEffectiveHrSubModulesForUser(user);
  if (!allowed("field")) {
    redirect("/app");
  }
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const todayStart = startOfTodayIst();

  const [checkIns, visits, members, todayPings, myPingTrail] = await Promise.all([
    listFieldCheckIns(user.organizationId, 500),
    listFieldVisits(user.organizationId),
    isManager ? listAssignableMembers(user.organizationId) : Promise.resolve([]),
    isManager
      ? listTodayPings(user.organizationId)
      : Promise.resolve([]),
    listMyDayTrail(user.organizationId, user.id),
  ]);

  const distanceMembers = isManager
    ? members.map((member) => ({ id: member.id, name: member.name }))
    : [{ id: user.id, name: user.name ?? user.email }];
  const todayDistances = await listTodayRecordedDistances(
    user.organizationId,
    distanceMembers.map((member) => member.id),
  );
  const distanceRows = distanceMembers.map((member) => ({
    userId: member.id,
    name: member.name,
    distance: todayDistances[member.id],
  }));

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
      proofUrl: row.photoAttachmentId
        ? `/api/hr/field-attachments/${row.photoAttachmentId}`
        : row.photoUrl,
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

  const managerVisitTrails = isManager
    ? [...todayCheckIns.reduce((grouped, row) => {
        const entries = grouped.get(row.userId) ?? [];
        entries.push(row);
        grouped.set(row.userId, entries);
        return grouped;
      }, new Map<string, typeof todayCheckIns>())]
        .map(([userId, rows]) => ({
          userId,
          name: rows[0]?.user.name ?? rows[0]?.user.email ?? "Executive",
          points: rows
            .sort((a, b) => a.checkedInAt.getTime() - b.checkedInAt.getTime())
            .map((row) => ({
              id: row.id,
              checkedInAt: row.checkedInAt,
              clientName: row.clientName ?? row.visit?.clientName ?? null,
              activityNote: row.activityNote,
              geoLat: row.geoLat,
              geoLng: row.geoLng,
              isLivePing: false as const,
              proofUrl: row.photoAttachmentId
                ? `/api/hr/field-attachments/${row.photoAttachmentId}`
                : row.photoUrl,
            })),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

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

  const myItinerary = visits
    .filter((visit) => visit.assigneeUserId === user.id)
    .sort((a, b) => {
      const aTime = a.plannedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.plannedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });

  const mapPoints = recentCheckIns.map((row) => ({
    id: row.id,
    userId: row.userId,
    userName: row.user.name ?? row.user.email,
    checkedInAt: row.checkedInAt.toISOString(),
    clientName: row.clientName ?? row.visit?.clientName ?? null,
    activityNote: row.activityNote,
    geoLat: row.geoLat,
    geoLng: row.geoLng,
    proofUrl: row.photoAttachmentId
      ? `/api/hr/field-attachments/${row.photoAttachmentId}`
      : row.photoUrl,
    visitId: row.visitId,
    visitStatus: row.visit?.status ?? null,
  }));

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Field Executive Tracking"
        description={fieldTrackingModule.tagline}
      />
      <FieldSubNav activePath="/app/field" />

      <p className="field-conveyance-entry">
        <Link className="btn-cta btn-primary" href="/app/field/conveyance">Open conveyance claims</Link>
        <span>Submit travel proof and bills, review claims, or record Accounts payment references.</span>
      </p>

      <p className="ws-hr-note">
        Standalone field operations — not part of HRMS. Plan visits, check in at
        client locations, and watch status move as executives visit. GPS is proof
        of visit; client travel is not blocked by a fixed radius.
      </p>

      <FieldMapSettings
        canEdit={hasMinimumRole(user.role, "ADMIN")}
        configured={Boolean(hrSettings.googleMapsEmbedApiKey)}
      />

      <section className="ws-hr-panel">
        <h2>My field schedule</h2>
        <p className="ws-hr-help">
          Your assigned appointments, visit purpose, and next action for the day.
        </p>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                <th>Scheduled</th>
                <th>Client / site</th>
                <th>Location</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Visit stamp &amp; proof</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {myItinerary.length === 0 ? (
                <tr>
                  <td colSpan={7}>No visits assigned yet.</td>
                </tr>
              ) : (
                myItinerary.map((visit) => (
                  <tr key={visit.id}>
                    <td>
                      {visit.plannedAt
                        ? visit.plannedAt.toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Time not set"}
                    </td>
                    <td>{visit.clientName}</td>
                    <td>{visit.locationLabel ?? "—"}</td>
                    <td>{visit.purpose ?? "—"}</td>
                    <td>{visit.status.replaceAll("_", " ")}</td>
                    <td>
                      {visit.checkIns[0] ? (
                        <>
                          <time dateTime={visit.checkIns[0].checkedInAt.toISOString()}>
                            {visit.checkIns[0].checkedInAt.toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })} IST
                          </time>
                          <br />
                          <span className="ws-apple-cell-secondary">
                            {visit.checkIns[0].geoLat.toFixed(5)}, {visit.checkIns[0].geoLng.toFixed(5)}
                          </span>
                          <br />
                          {visit.checkIns[0].photoAttachmentId ? (
                            <a href={`/api/hr/field-attachments/${visit.checkIns[0].photoAttachmentId}`}>Open photo / proof</a>
                          ) : visit.checkIns[0].photoUrl ? (
                            <a href={visit.checkIns[0].photoUrl} target="_blank" rel="noopener noreferrer">Open photo / proof link</a>
                          ) : (
                            <span className="ws-hr-feedback-error">Proof missing on older visit</span>
                          )}
                        </>
                      ) : "Not visited yet"}
                    </td>
                    <td>
                      {visit.status === "PLANNED" ? (
                        <FieldVisitStatusButton
                          visitId={visit.id}
                          status="IN_PROGRESS"
                          label="Start visit"
                          action={updateFieldVisitStatusAction}
                        />
                      ) : visit.status === "IN_PROGRESS" ? (
                        <FieldVisitStatusButton
                          visitId={visit.id}
                          status="COMPLETED"
                          label="Complete visit"
                          action={updateFieldVisitStatusAction}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <FieldLivePinger enabled />

      {isManager ? <FieldLiveBoard pings={livePings} /> : null}

      <FieldDistanceBoard
        rows={distanceRows}
        title={isManager ? "Distance recorded today — team" : "My distance recorded today"}
      />

      <div className="ws-hr-split">
        {isManager ? (
          <section className="ws-hr-panel">
            <h2>Plan a visit</h2>
            <p className="ws-hr-help">
              Assign first. When the executive checks in against this plan, status
              updates automatically.
            </p>
            <PlanFieldVisitForm
              members={members.map((m) => ({
                id: m.id,
                name: m.name,
              }))}
            />
          </section>
        ) : null}

        <section className="ws-hr-panel">
          <h2>Field check-in</h2>
          <p className="ws-hr-help">
            Link a planned visit when you arrive. Status moves from Planned → In
            progress → Completed as you stamp GPS + proof.
          </p>
          <GeoPunchForm
            action={recordFieldCheckInAction}
            submitLabel="Save field check-in"
            requireGeo
            successMessage="Field check-in saved. Linked visit status updated."
            visits={myOpenVisits}
          >
            <label>
              Client / site name
              <input
                name="clientName"
                type="text"
                placeholder="e.g. Sharma Traders, ABC Mobile, Metro Site"
              />
            </label>
            <label>
              Visit type
              <select name="visitType" defaultValue="CLIENT_VISIT">
                <option value="CLIENT_VISIT">Client visit / service</option>
                <option value="RETAIL_ORDER">Retail shop order</option>
                <option value="DISTRIBUTION">Distribution / sample drop</option>
                <option value="CONSTRUCTION_SITE">Construction site visit</option>
                <option value="BD_PROSPECTING">Business development prospect</option>
                <option value="COLLECTION">Payment collection</option>
              </select>
            </label>
            <label>
              Calling remarks
              <textarea
                name="callingRemarks"
                rows={2}
                placeholder="Call outcome, owner response, decision maker spoken to"
              />
            </label>
            <label>
              Visit notes
              <textarea
                name="activityNote"
                rows={3}
                placeholder="What happened at the visit, site observations, prospect details"
              />
            </label>
            <label>
              Next visit date
              <input name="nextVisitDate" type="date" />
            </label>
            <label>
              Order / requirement
              <textarea
                name="orderDetails"
                rows={2}
                placeholder="Order value/items, stock requirement, lead requirement"
              />
            </label>
            <label>
              Distribution / documents notes
              <textarea
                name="distributionDetails"
                rows={2}
                placeholder="Samples delivered, documents collected, delivery notes"
              />
            </label>
            <FieldProofUpload />
          </GeoPunchForm>
        </section>
      </div>

      <FieldMapBoard
        points={mapPoints}
        teamMembers={
          isManager
            ? members.map((member) => ({ id: member.id, name: member.name }))
            : [{ id: user.id, name: user.name ?? user.email }]
        }
        canFilterTeam={isManager}
        googleMapsApiKey={hrSettings.googleMapsEmbedApiKey}
      />

      <FieldDayTrail
        title="My day trail"
        points={myTodayTrail}
        googleMapsApiKey={hrSettings.googleMapsEmbedApiKey}
      />
      {isManager ? (
        <section className="ws-hr-panel">
          <h2>Team visited-location tours</h2>
          <p className="ws-hr-help">Open each executive’s ordered visit stamps and Google Maps route for today.</p>
          {managerVisitTrails.length === 0 ? (
            <p className="ws-hr-note">No team visit stamps yet today.</p>
          ) : managerVisitTrails.map((trail) => (
            <details key={trail.userId} className="field-team-tour">
              <summary>{trail.name} · {trail.points.length} visited stop{trail.points.length === 1 ? "" : "s"}</summary>
              <FieldDayTrail
                title={`Visited tour — ${trail.name}`}
                points={trail.points}
                googleMapsApiKey={hrSettings.googleMapsEmbedApiKey}
              />
            </details>
          ))}
        </section>
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
                <th>Visit outcome</th>
                <th>Proof</th>
              </tr>
            </thead>
            <tbody>
              {recentCheckIns.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5}>No field check-ins yet.</td>
                </tr>
              ) : (
                recentCheckIns.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <time dateTime={row.checkedInAt.toISOString()}>
                        {row.checkedInAt.toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })} IST
                      </time>
                    </td>
                    {isManager ? (
                      <td>{row.user.name ?? row.user.email}</td>
                    ) : null}
                    <td>{row.clientName ?? row.visit?.clientName ?? "-"}</td>
                    <td>
                      {row.geoLat.toFixed(5)}, {row.geoLng.toFixed(5)}
                    </td>
                    <td>
                      {row.activityNote ||
                      row.callingRemarks ||
                      row.orderDetails ||
                      row.distributionDetails ? (
                        <details>
                          <summary>View details</summary>
                          <div className="ws-hr-meta">
                            {row.callingRemarks ? (
                              <p><strong>Call:</strong> {row.callingRemarks}</p>
                            ) : null}
                            {row.activityNote ? (
                              <p><strong>Visit:</strong> {row.activityNote}</p>
                            ) : null}
                            {row.nextVisitDate ? (
                              <p>
                                <strong>Follow-up:</strong>{" "}
                                {row.nextVisitDate.toLocaleDateString("en-IN", {
                                  timeZone: "Asia/Kolkata",
                                  dateStyle: "medium",
                                })}
                              </p>
                            ) : null}
                            {row.orderDetails ? (
                              <p><strong>Order / need:</strong> {row.orderDetails}</p>
                            ) : null}
                            {row.distributionDetails ? (
                              <p><strong>Delivery / documents:</strong> {row.distributionDetails}</p>
                            ) : null}
                          </div>
                        </details>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {row.photoAttachmentId ? (
                        <a
                          href={`/api/hr/field-attachments/${row.photoAttachmentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open proof
                        </a>
                      ) : row.photoUrl ? (
                        <a
                          href={row.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open link
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
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
                <th>Scheduled</th>
                  <th>Client</th>
                  <th>Location</th>
                  <th>Reference GPS</th>
                  <th>Status</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                {visits.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No visits planned.</td>
                  </tr>
                ) : (
                  visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{visit.assignee.name ?? visit.assignee.email}</td>
                      <td>
                        {visit.plannedAt
                          ? visit.plannedAt.toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Time not set"}
                      </td>
                      <td>{visit.clientName}</td>
                      <td>{visit.locationLabel ?? "-"}</td>
                      <td>
                        {visit.geoLat != null && visit.geoLng != null
                          ? `${visit.geoLat.toFixed(4)}, ${visit.geoLng.toFixed(4)}`
                          : "—"}
                      </td>
                      <td>
                        {visit.status.replaceAll("_", " ")}
                        {visit.checkIns[0] ? (
                          <>
                            <br />
                            <span className="ws-apple-cell-secondary">
                              Last visit{" "}
                              {visit.checkIns[0].checkedInAt.toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </>
                        ) : null}
                      </td>
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
