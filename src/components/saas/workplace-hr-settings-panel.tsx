import { updateHrSettingsAction } from "@/lib/hr/hr-actions";

type WorkplaceHrSettings = {
  officeLat: number | null;
  officeLng: number | null;
  geoFenceRadiusM: number;
  faceRecognitionEnabled: boolean;
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
        Office geo-fence and face recognition policy for the whole team. Per-member
        attendance rules are set when you edit a team member.
      </p>
      <form action={updateHrSettingsAction} className="ws-hr-form">
        <div className="form-grid-premium">
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
            name="faceRecognitionEnabled"
            type="checkbox"
            defaultChecked={settings.faceRecognitionEnabled}
          />
          Enable facial recognition for the organization
        </label>
        <div className="form-actions">
          <button type="submit" className="btn-cta btn-primary">
            Save workplace settings
          </button>
        </div>
      </form>
    </section>
  );
}
