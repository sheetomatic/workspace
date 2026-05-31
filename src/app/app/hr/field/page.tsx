import { PageHeader } from "@/components/saas/page-header";
import { GeoPunchForm } from "@/components/hr/geo-punch-form";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
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

export default async function HrFieldPage() {
  const user = await requireSession();
  const isManager = hasMinimumRole(user.role, "MANAGER");
  const [checkIns, visits, members] = await Promise.all([
    listFieldCheckIns(user.organizationId),
    listFieldVisits(user.organizationId),
    isManager ? listAssignableMembers(user.organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Field executive tracking"
        description={fieldTrackingModule.tagline}
      />
      <HrSubNav activePath="/app/hr/field" />

      <p className="ws-hr-note">
        Separate from office attendance. Use this module for sales, service, and
        collection teams checking in at client locations.
      </p>

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

      <section className="ws-hr-panel">
        <h2>Recent field check-ins</h2>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Executive</th>
                <th>Client</th>
                <th>Location</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.length === 0 ? (
                <tr>
                  <td colSpan={5}>No field check-ins yet.</td>
                </tr>
              ) : (
                checkIns.map((row) => (
                  <tr key={row.id}>
                    <td>{row.checkedInAt.toLocaleString()}</td>
                    <td>{row.user.name ?? row.user.email}</td>
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
