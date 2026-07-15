"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteHrWorkSiteAction, saveHrWorkSiteAction } from "@/lib/hr/hr-actions";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

type HrWorkSiteRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  geoFenceRadiusM: number;
};

export function HrWorkSitesPanel({ sites }: { sites: HrWorkSiteRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);

  function onSave(formData: FormData) {
    const isAdd = !String(formData.get("id") ?? "").trim();
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await saveHrWorkSiteAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Work site saved.");
      setIsError(false);
      if (isAdd) {
        setAddFormKey((key) => key + 1);
      }
      router.refresh();
    });
  }

  function onDelete(siteId: string) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await deleteHrWorkSiteAction(siteId);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage("Work site deleted.");
      setIsError(false);
      router.refresh();
    });
  }

  return (
    <section className="saas-form-panel ws-workplace-hr-settings">
      <h3>Work sites (multi-office)</h3>
      <p className="saas-team-invite-lead">
        Add each office or branch with GPS coordinates. Attendance check-in uses the
        selected site geo-fence. Legacy single office fields above still work when no
        sites are listed.
      </p>
      <HrFeedbackBanner message={message} isError={isError} />

      {sites.length > 0 ? (
        <ul className="ws-hr-sites-list">
          {sites.map((site) => (
            <li key={site.id} className="ws-hr-site-item">
              <form action={onSave} className="ws-hr-form ws-hr-site-form">
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
                  <button
                    type="submit"
                    className="btn-secondary btn-sm"
                    disabled={pending}
                  >
                    Save site
                  </button>
                </div>
              </form>
              <div className="ws-hr-site-delete">
                <button
                  type="button"
                  className="btn-secondary btn-sm danger"
                  disabled={pending}
                  onClick={() => onDelete(site.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ws-hr-help">No work sites yet. Add your first office below.</p>
      )}

      <form
        key={addFormKey}
        action={onSave}
        className="ws-hr-form ws-hr-site-add"
      >
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
          <button
            type="submit"
            className="btn-cta btn-primary"
            disabled={pending}
          >
            {pending ? "Saving…" : "Add site"}
          </button>
        </div>
      </form>
    </section>
  );
}
