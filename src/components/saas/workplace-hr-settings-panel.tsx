import { updateHrSettingsAction } from "@/lib/hr/hr-actions";

type WorkplaceHrSettings = {
  officeLat: number | null;
  officeLng: number | null;
  geoFenceRadiusM: number;
  faceRecognitionEnabled: boolean;
  workStartTime?: string;
  workEndTime?: string;
  lateGraceMinutes?: number;
  halfDayEnabled?: boolean;
  shortLeaveEnabled?: boolean;
  shortLeaveHours?: number;
};

export function WorkplaceHrSettingsPanel({
  settings,
}: {
  settings: WorkplaceHrSettings;
}) {
  return (
    <section className="saas-form-panel ws-workplace-hr-settings">
      <h3>Workplace attendance settings</h3>
      <p className="saas-team-invite-lead">
        Working hours, shifts, short leave / half day policy, office geo-fence, and face
        recognition. Assign a shift and White/Blue category on the employee profile.
      </p>
      <form action={updateHrSettingsAction} className="ws-hr-form">
        <div className="form-grid-premium">
          <label>
            Work start time
            <input
              name="workStartTime"
              type="time"
              required
              defaultValue={settings.workStartTime ?? "09:30"}
            />
          </label>
          <label>
            Work end time
            <input
              name="workEndTime"
              type="time"
              required
              defaultValue={settings.workEndTime ?? "18:30"}
            />
          </label>
          <label>
            Late grace (minutes)
            <input
              name="lateGraceMinutes"
              type="number"
              min={0}
              max={120}
              defaultValue={settings.lateGraceMinutes ?? 15}
            />
          </label>
          <label>
            Short leave hours
            <input
              name="shortLeaveHours"
              type="number"
              min={0.25}
              step={0.25}
              defaultValue={settings.shortLeaveHours ?? 2}
            />
          </label>
          <label>
            Office latitude
            <input
              name="officeLat"
              type="number"
              step="any"
              defaultValue={settings.officeLat ?? ""}
            />
          </label>
          <label>
            Office longitude
            <input
              name="officeLng"
              type="number"
              step="any"
              defaultValue={settings.officeLng ?? ""}
            />
          </label>
          <label>
            Geo-fence radius (meters)
            <input
              name="geoFenceRadiusM"
              type="number"
              defaultValue={settings.geoFenceRadiusM}
            />
          </label>
        </div>
        <label className="ws-hr-checkbox">
          <input
            name="halfDayEnabled"
            type="checkbox"
            defaultChecked={settings.halfDayEnabled ?? true}
          />
          Allow half day marking (0.5 payable day)
        </label>
        <label className="ws-hr-checkbox">
          <input
            name="shortLeaveEnabled"
            type="checkbox"
            defaultChecked={settings.shortLeaveEnabled ?? true}
          />
          Allow short leave (deducts short leave hours from the working day)
        </label>
        <label className="ws-hr-checkbox">
          <input
            name="faceRecognitionEnabled"
            type="checkbox"
            defaultChecked={settings.faceRecognitionEnabled}
          />
          Enable facial recognition for the organization
        </label>
        <p className="ws-hr-help">
          Self check-in creates Present pending manager verify. Unverified punches
          are not payable. Late and Blue OT use the employee&apos;s shift end time
          (or org default hours). Manage named shifts in Shifts &amp; timing below.
        </p>
        <div className="form-actions">
          <button type="submit" className="btn-cta btn-primary">
            Save workplace settings
          </button>
        </div>
      </form>
    </section>
  );
}
