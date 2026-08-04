"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { HrActionResult } from "@/lib/hr/hr-result";
import { HR_OUT_OF_LOCATION_MESSAGE } from "@/lib/hr/hr-result";
import {
  isWithinVisitGeofence,
  type VisitGeofence,
} from "@/lib/hr/field-geofence";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";

export type FieldVisitOption = {
  id: string;
  clientName: string;
  locationLabel: string | null;
  status: string;
  geofence: VisitGeofence | null;
};

type GeoPunchFormProps = {
  action: (formData: FormData) => Promise<HrActionResult>;
  children?: React.ReactNode;
  submitLabel: string;
  requireGeo?: boolean;
  successMessage?: string;
  siteId?: string | null;
  sites?: Array<{ id: string; name: string }>;
  /** Optional planned visits for field check-in + geofence UX. */
  visits?: FieldVisitOption[];
  /** Reset fields after a successful punch. Default true. */
  resetOnSuccess?: boolean;
};

export function GeoPunchForm({
  action,
  children,
  submitLabel,
  requireGeo = false,
  successMessage = "Checked in successfully.",
  siteId,
  sites = [],
  visits = [],
  resetOnSuccess = true,
}: GeoPunchFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const defaultSiteId =
    siteId ?? (sites.length === 1 ? sites[0]?.id ?? "" : "");
  const [selectedSiteId, setSelectedSiteId] = useState(defaultSiteId);
  const [selectedVisitId, setSelectedVisitId] = useState("");

  const selectedVisit = useMemo(
    () => visits.find((v) => v.id === selectedVisitId) ?? null,
    [visits, selectedVisitId],
  );

  const GOOD_ACCURACY_M = 25;
  const GPS_WATCH_MS = 12000;

  function applyFix(pos: GeolocationPosition) {
    setManualLat(String(pos.coords.latitude));
    setManualLng(String(pos.coords.longitude));
    setAccuracyM(
      Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
    );
  }

  /**
   * Empty/invalid input must NOT become a coordinate — `Number("")` is 0,
   * which used to submit lat/lng (0,0) and fail the geofence by ~9,300km.
   */
  function parseCoords(latText: string, lngText: string) {
    const latRaw = latText.trim();
    const lngRaw = lngText.trim();
    if (!latRaw || !lngRaw) {
      return null;
    }
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    if (lat === 0 && lng === 0) {
      return null;
    }
    return { lat, lng };
  }

  /**
   * Watch GPS for up to 12s and keep the most accurate fix instead of the
   * first (often cached / Wi-Fi coarse) reading — the main cause of false
   * "out of location" failures.
   */
  function watchBestFix(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      let best: GeolocationPosition | null = null;
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        navigator.geolocation.clearWatch(watchId);
        window.clearTimeout(timeoutId);
        resolve(best);
      };

      const timeoutId = window.setTimeout(finish, GPS_WATCH_MS);

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!best || pos.coords.accuracy < best.coords.accuracy) {
            best = pos;
            setMessage(
              `Improving GPS accuracy… ±${Math.round(pos.coords.accuracy)}m`,
            );
          }
          if (pos.coords.accuracy <= GOOD_ACCURACY_M) {
            finish();
          }
        },
        (err) => {
          // Permission denied fails immediately; other errors wait for timeout.
          if (err.code === err.PERMISSION_DENIED) {
            finish();
          }
        },
        { enableHighAccuracy: true, timeout: GPS_WATCH_MS, maximumAge: 0 },
      );
    });
  }

  async function captureLocation() {
    setLocating(true);
    setMessage("Getting GPS fix…");
    setIsError(false);

    const best = await watchBestFix();
    setLocating(false);
    if (!best) {
      setMessage(
        "Could not read location. Allow location access (enable Precise Location) and try again.",
      );
      setIsError(true);
      return;
    }
    applyFix(best);
    const acc = best.coords.accuracy;
    if (Number.isFinite(acc) && acc > 100) {
      setMessage(
        `Location captured (±${Math.round(acc)}m — weak signal). If check-in fails, move near a window or open sky and refresh location.`,
      );
    } else {
      setMessage("Location captured.");
    }
    setIsError(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setIsError(false);
    const form = event.currentTarget;
    const formData = new FormData(form);

    let coords = parseCoords(manualLat, manualLng);
    let fixAccuracyM = accuracyM;

    // One-tap check-in: no location yet? Capture it now instead of failing.
    if (requireGeo && !coords) {
      setLocating(true);
      setMessage("Getting your GPS location…");
      const best = await watchBestFix();
      setLocating(false);
      if (best) {
        applyFix(best);
        coords = parseCoords(
          String(best.coords.latitude),
          String(best.coords.longitude),
        );
        fixAccuracyM = Number.isFinite(best.coords.accuracy)
          ? best.coords.accuracy
          : null;
      }
    }

    if (coords) {
      formData.set("geoLat", String(coords.lat));
      formData.set("geoLng", String(coords.lng));
      if (fixAccuracyM != null && Number.isFinite(fixAccuracyM)) {
        formData.set("accuracyM", String(fixAccuracyM));
      }
    } else {
      formData.delete("geoLat");
      formData.delete("geoLng");
      formData.delete("accuracyM");
    }
    if (selectedSiteId) {
      formData.set("siteId", selectedSiteId);
    }
    if (selectedVisitId) {
      formData.set("visitId", selectedVisitId);
    }
    if (requireGeo && !coords) {
      setMessage(
        "We couldn't read your location. Allow location access (enable Precise Location for the browser) and tap again.",
      );
      setIsError(true);
      setPending(false);
      return;
    }
    if (requireGeo && sites.length > 1 && !selectedSiteId) {
      setMessage("Select your work site before checking in.");
      setIsError(true);
      setPending(false);
      return;
    }

    if (coords && selectedVisit?.geofence) {
      const check = isWithinVisitGeofence(
        coords.lat,
        coords.lng,
        selectedVisit.geofence,
      );
      if (!check.ok) {
        formData.set("geoFenceWarning", String(Math.round(check.distanceM)));
      }
    }

    const result = await action(formData);
    if (!result.ok) {
      setMessage(
        result.code === "OUT_OF_LOCATION"
          ? result.message || HR_OUT_OF_LOCATION_MESSAGE
          : result.message,
      );
      setIsError(true);
      setPending(false);
      return;
    }

    setMessage(successMessage);
    setIsError(false);
    if (resetOnSuccess) {
      form.reset();
      setManualLat("");
      setManualLng("");
      setAccuracyM(null);
      setSelectedVisitId("");
      setSelectedSiteId(
        siteId ?? (sites.length === 1 ? sites[0]?.id ?? "" : ""),
      );
    }
    setPending(false);
    router.refresh();
  }

  const displayCoords = parseCoords(manualLat, manualLng);

  return (
    <form onSubmit={handleSubmit} className="ws-hr-form">
      <HrFeedbackBanner message={message} isError={isError} />
      {requireGeo && sites.length > 1 ? (
        <label className="ws-attendance-site-select">
          Work site
          <select
            name="siteId"
            required
            value={selectedSiteId}
            onChange={(event) => setSelectedSiteId(event.target.value)}
          >
            <option value="">Select site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {visits.length > 0 ? (
        <label>
          Planned visit (optional)
          <select
            name="visitId"
            value={selectedVisitId}
            onChange={(event) => setSelectedVisitId(event.target.value)}
          >
            <option value="">No linked visit</option>
            {visits.map((visit) => (
              <option key={visit.id} value={visit.id}>
                {visit.clientName}
                {visit.locationLabel ? ` · ${visit.locationLabel}` : ""}
                {visit.geofence
                  ? ` · fence ${visit.geofence.geoFenceRadiusM}m`
                  : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {selectedVisit?.geofence ? (
        <p className="ws-hr-help">
          Reference location: {selectedVisit.geofence.geoFenceRadiusM}m around{" "}
          {selectedVisit.geofence.geoLat.toFixed(4)},{" "}
          {selectedVisit.geofence.geoLng.toFixed(4)}. This is used for review,
          but travelling check-ins are not blocked by radius.
        </p>
      ) : null}
      {children}
      <div className="ws-hr-form-actions">
        <button
          type="button"
          className="btn-cta btn-secondary"
          onClick={() => void captureLocation()}
          disabled={locating || pending}
        >
          {locating
            ? "Locating…"
            : manualLat && manualLng
              ? "Refresh location"
              : "Use my location"}
        </button>
        <button
          type="submit"
          className="btn-cta btn-primary"
          disabled={pending || locating}
        >
          {pending ? (locating ? "Getting GPS…" : "Saving...") : submitLabel}
        </button>
      </div>
      {requireGeo ? (
        <div className="ws-hr-coordinate-grid">
          <label>
            Latitude
            <input
              name="manualGeoLat"
              type="number"
              step="any"
              value={manualLat}
              onChange={(event) => {
                setManualLat(event.target.value);
                setAccuracyM(null);
              }}
              placeholder="e.g. 19.0760"
            />
          </label>
          <label>
            Longitude
            <input
              name="manualGeoLng"
              type="number"
              step="any"
              value={manualLng}
              onChange={(event) => {
                setManualLng(event.target.value);
                setAccuracyM(null);
              }}
              placeholder="e.g. 72.8777"
            />
          </label>
        </div>
      ) : null}
      {displayCoords ? (
        <p className="ws-hr-meta">
          GPS: {displayCoords.lat.toFixed(5)}, {displayCoords.lng.toFixed(5)}
          {accuracyM != null ? ` · accuracy ~${Math.round(accuracyM)}m` : " · edited"}
        </p>
      ) : null}
    </form>
  );
}
