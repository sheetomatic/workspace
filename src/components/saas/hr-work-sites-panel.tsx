import { deleteHrWorkSiteAction, saveHrWorkSiteAction } from "@/lib/hr/hr-actions";

type HrWorkSiteRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  geoFenceRadiusM: number;
};

export function HrWorkSitesPanel({ sites }: { sites: HrWorkSiteRow[] }) {
  return (
    <section className="saas-form-panel ws-workplace-hr-settings">
      <h3>Work sites (multi-office)</h3>
      <p className="saas-team-invite-lead">
        Add each office or branch with GPS coordinates. Attendance check-in uses the
        selected site geo-fence. Legacy single office fields above still work when no
        sites are listed.
      </p>

      {sites.length > 0 ? (
        <ul className="ws-hr-sites-list">
          {sites.map((site) => (
            <li key={site.id} className="ws-hr-site-item">
              <form action={saveHrWorkSiteAction} className="ws-hr-form ws-hr-site-form">
                <input name="id" type="hidden" value={site.id} />
                <div className="form-grid-premium">
                  <label>
                    Site name
                    <input name="name" defaultValue={site.name} required />
                  </label>
                  <label>
                    Latitude
                    <input name="lat" type="number" step="any" defaultValue={site.lat} required />
                  </label>
                  <label>
                    Longitude
                    <input name="lng" type="number" step="any" defaultValue={site.lng} required />
                  </label>
                  <label>
                    Radius (m)
                    <input
                      name="geoFenceRadiusM"
                      type="number"
                      defaultValue={site.geoFenceRadiusM}
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-secondary btn-sm">
                    Save site
                  </button>
                </div>
              </form>
              <form
                action={deleteHrWorkSiteAction.bind(null, site.id)}
                className="ws-hr-site-delete"
              >
                <button type="submit" className="btn-secondary btn-sm danger">
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ws-hr-help">No work sites yet. Add your first office below.</p>
      )}

      <form action={saveHrWorkSiteAction} className="ws-hr-form ws-hr-site-add">
        <h4>Add work site</h4>
        <div className="form-grid-premium">
          <label>
            Site name
            <input name="name" placeholder="HQ / Branch / Factory" required />
          </label>
          <label>
            Latitude
            <input name="lat" type="number" step="any" required />
          </label>
          <label>
            Longitude
            <input name="lng" type="number" step="any" required />
          </label>
          <label>
            Radius (m)
            <input name="geoFenceRadiusM" type="number" defaultValue={200} />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-cta btn-primary">
            Add site
          </button>
        </div>
      </form>
    </section>
  );
}
