"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import type { HrActionResult } from "@/lib/hr/hr-result";
import { HR_OUT_OF_LOCATION_MESSAGE } from "@/lib/hr/hr-result";
import {
  isWithinVisitGeofence,
  type VisitGeofence,
} from "@/lib/hr/field-geofence";

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
}: GeoPunchFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [accuracyM, setAccuracyM] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState(
    siteId ?? (sites.length === 1 ? sites[0]?.id ?? "" : ""),
  );
  const [selectedVisitId, setSelectedVisitId] = useState("");

  const selectedVisit = useMemo(
    () => visits.find((v) => v.id === selectedVisitId) ?? null,
    [visits, selectedVisitId],
  );

  function captureLocation() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported on this device.");
      setIsError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setManualLat(String(pos.coords.latitude));
        setManualLng(String(pos.coords.longitude));
        setAccuracyM(
          Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        );
        setMessage("Location captured.");
        setIsError(false);
      },
      () => {
        setMessage("Could not read location. Allow GPS and try again.");
        setIsError(true);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setIsError(false);
    const formData = new FormData(event.currentTarget);
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    if (hasCoords) {
      formData.set("geoLat", String(lat));
      formData.set("geoLng", String(lng));
      if (accuracyM != null && Number.isFinite(accuracyM)) {
        formData.set("accuracyM", String(accuracyM));
      }
    }
    if (selectedSiteId) {
      formData.set("siteId", selectedSiteId);
    }
    if (selectedVisitId) {
      formData.set("visitId", selectedVisitId);
    }
    if (requireGeo && !hasCoords) {
      setMessage("Capture location or enter valid latitude/longitude before submitting.");
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

    if (hasCoords && selectedVisit?.geofence) {
      const check = isWithinVisitGeofence(
        lat,
        lng,
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
    setPending(false);
    router.refresh();
  }

  const displayLat = Number(manualLat);
  const displayLng = Number(manualLng);
  const hasDisplayCoords = Number.isFinite(displayLat) && Number.isFinite(displayLng);

  return (
    <form onSubmit={handleSubmit} className="ws-hr-form">
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
          onClick={captureLocation}
        >
          {manualLat && manualLng ? "Refresh location" : "Use my location"}
        </button>
        <button type="submit" className="btn-cta btn-primary" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
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
      {hasDisplayCoords ? (
        <p className="ws-hr-meta">
          GPS: {displayLat.toFixed(5)}, {displayLng.toFixed(5)}
          {accuracyM != null ? ` · accuracy ~${Math.round(accuracyM)}m` : " · edited"}
        </p>
      ) : null}
      {message ? (
        <p className={isError ? "ws-hr-feedback ws-hr-feedback-error" : "ws-hr-feedback"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
