"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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

/** Step-by-step fix guide shown whenever GPS capture fails. */
function LocationHelpGuide() {
  const isIos =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent);

  const android = (
    <details className="ws-geo-help-device" open={!isIos}>
      <summary>Android (Chrome)</summary>
      <ol>
        <li>
          Tap the <strong>lock / ⓘ icon</strong> left of the address bar →{" "}
          <strong>Permissions</strong> → <strong>Location</strong> →{" "}
          <strong>Allow</strong>.
        </li>
        <li>
          Pull down the notification shade and make sure{" "}
          <strong>Location (GPS)</strong> is switched on.
        </li>
        <li>
          Phone <strong>Settings → Apps → Chrome → Permissions → Location</strong>{" "}
          → choose <strong>Allow while using</strong> and turn on{" "}
          <strong>Use precise location</strong>.
        </li>
        <li>Come back here, reload the page, and tap Check in again.</li>
      </ol>
    </details>
  );

  const ios = (
    <details className="ws-geo-help-device" open={isIos}>
      <summary>iPhone (Safari)</summary>
      <ol>
        <li>
          Phone <strong>Settings → Privacy &amp; Security → Location Services</strong>{" "}
          → switch <strong>On</strong>.
        </li>
        <li>
          In the same list, scroll to <strong>Safari Websites</strong> → choose{" "}
          <strong>While Using the App</strong> and turn on{" "}
          <strong>Precise Location</strong>.
        </li>
        <li>
          If it still fails: in Safari tap the <strong>aA / ⓘ icon</strong> in the
          address bar → <strong>Website Settings</strong> →{" "}
          <strong>Location → Allow</strong>.
        </li>
        <li>Come back here, reload the page, and tap Check in again.</li>
      </ol>
    </details>
  );

  return (
    <div className="ws-geo-help" role="note">
      <p className="ws-geo-help-title">How to enable location</p>
      {isIos ? ios : android}
      {isIos ? android : ios}
      <p className="ws-geo-help-tips">
        Still failing? Stand near a window or open sky, switch off battery
        saver, and wait 10–15 seconds — the first GPS fix is the slowest. If
        the browser never asks for permission, clear this site&apos;s settings
        and reload.
      </p>
    </div>
  );
}

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
  const [coordsSource, setCoordsSource] = useState<"gps" | "manual" | null>(
    null,
  );
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
  const [showLocationHelp, setShowLocationHelp] = useState(false);

  // Warn about blocked location before the person taps Check in, so the
  // fix guide is already on screen instead of a surprise failure.
  useEffect(() => {
    if (!requireGeo) return;
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let status: PermissionStatus | null = null;
    const sync = () => {
      if (status?.state === "denied") {
        setMessage(
          "Location permission is blocked for this site. Follow the steps below to allow it, then reload this page.",
        );
        setIsError(true);
        setShowLocationHelp(true);
      }
    };
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result) => {
        status = result;
        sync();
        result.onchange = sync;
      })
      .catch(() => {
        // Permissions API unsupported (older iOS) — errors are handled on tap.
      });
    return () => {
      if (status) status.onchange = null;
    };
  }, [requireGeo]);

  function applyFix(pos: GeolocationPosition) {
    setManualLat(String(pos.coords.latitude));
    setManualLng(String(pos.coords.longitude));
    setAccuracyM(
      Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
    );
    setCoordsSource("gps");
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

  type GpsFailReason = "unsupported" | "denied" | "unavailable" | "timeout";

  type GpsResult =
    | { pos: GeolocationPosition; reason: null }
    | { pos: null; reason: GpsFailReason };

  /**
   * Watch GPS for up to 12s and keep the most accurate fix instead of the
   * first (often cached / Wi-Fi coarse) reading — the main cause of false
   * "out of location" failures. On failure the reason is reported so the
   * user gets an actionable message instead of a generic one.
   */
  function watchBestFix(): Promise<GpsResult> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ pos: null, reason: "unsupported" });
        return;
      }

      let best: GeolocationPosition | null = null;
      let lastError: GeolocationPositionError | null = null;
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        navigator.geolocation.clearWatch(watchId);
        window.clearTimeout(timeoutId);
        if (best) {
          resolve({ pos: best, reason: null });
          return;
        }
        const reason: GpsFailReason =
          lastError?.code === 1
            ? "denied"
            : lastError?.code === 2
              ? "unavailable"
              : "timeout";
        resolve({ pos: null, reason });
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
          lastError = err;
          // Permission denied fails immediately; other errors wait for timeout.
          if (err.code === err.PERMISSION_DENIED) {
            finish();
          }
        },
        { enableHighAccuracy: true, timeout: GPS_WATCH_MS, maximumAge: 0 },
      );
    });
  }

  function gpsFailMessage(reason: GpsFailReason) {
    switch (reason) {
      case "unsupported":
        return "This browser cannot read GPS. Open this page in Chrome (Android) or Safari (iPhone) and try again.";
      case "denied":
        return "Location permission is blocked for this site. Follow the steps below to allow it, then tap Check in again.";
      case "unavailable":
        return "Your phone's Location/GPS is switched off or has no signal. Turn on Location in your phone settings, then tap Check in again.";
      case "timeout":
        return "GPS timed out before getting a fix. Move near a window or open sky, keep the phone still, and tap Check in again.";
    }
  }

  function onGpsFailed(reason: GpsFailReason) {
    setMessage(gpsFailMessage(reason));
    setIsError(true);
    setShowLocationHelp(true);
  }

  async function captureLocation() {
    setLocating(true);
    setMessage("Getting GPS fix…");
    setIsError(false);

    const { pos: best, reason } = await watchBestFix();
    setLocating(false);
    if (!best) {
      onGpsFailed(reason);
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
    const typedManually = coords !== null && coordsSource === "manual";

    // One-tap check-in: always take a fresh GPS fix on submit (unless the
    // person typed coordinates by hand). Falls back to the last captured
    // fix if the fresh read fails mid-session.
    let gpsFailReason: GpsFailReason | null = null;
    if (requireGeo && !typedManually) {
      setLocating(true);
      setMessage("Getting your GPS location…");
      const { pos: best, reason } = await watchBestFix();
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
      } else {
        gpsFailReason = reason;
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
      onGpsFailed(gpsFailReason ?? "timeout");
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
      setCoordsSource(null);
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
        {!requireGeo ? (
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
        ) : null}
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
                setCoordsSource("manual");
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
                setCoordsSource("manual");
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
      {requireGeo ? (
        <button
          type="button"
          className="ws-geo-help-toggle"
          onClick={() => setShowLocationHelp((open) => !open)}
        >
          {showLocationHelp ? "Hide location help" : "Location not working? See how to enable it"}
        </button>
      ) : null}
      {requireGeo && showLocationHelp ? <LocationHelpGuide /> : null}
    </form>
  );
}
