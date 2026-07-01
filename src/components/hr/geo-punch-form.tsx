"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { HrActionResult } from "@/lib/hr/hr-result";
import { HR_OUT_OF_LOCATION_MESSAGE } from "@/lib/hr/hr-result";

type GeoPunchFormProps = {
  action: (formData: FormData) => Promise<HrActionResult>;
  children?: React.ReactNode;
  submitLabel: string;
  requireGeo?: boolean;
  successMessage?: string;
  siteId?: string | null;
  sites?: Array<{ id: string; name: string }>;
};

export function GeoPunchForm({
  action,
  children,
  submitLabel,
  requireGeo = false,
  successMessage = "Checked in successfully.",
  siteId,
  sites = [],
}: GeoPunchFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [selectedSiteId, setSelectedSiteId] = useState(
    siteId ?? (sites.length === 1 ? sites[0]?.id ?? "" : ""),
  );

  function captureLocation() {
    if (!navigator.geolocation) {
      setMessage("Geolocation is not supported on this device.");
      setIsError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
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
    if (coords) {
      formData.set("geoLat", String(coords.lat));
      formData.set("geoLng", String(coords.lng));
    }
    if (selectedSiteId) {
      formData.set("siteId", selectedSiteId);
    }
    if (requireGeo && !coords) {
      setMessage("Capture location before submitting.");
      setIsError(true);
      setPending(false);
      return;
    }
    if (sites.length > 1 && !selectedSiteId) {
      setMessage("Select your work site before checking in.");
      setIsError(true);
      setPending(false);
      return;
    }

    const result = await action(formData);
    if (!result.ok) {
      setMessage(
        result.code === "OUT_OF_LOCATION"
          ? HR_OUT_OF_LOCATION_MESSAGE
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

  return (
    <form onSubmit={handleSubmit} className="ws-hr-form">
      {sites.length > 1 ? (
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
      {children}
      <div className="ws-hr-form-actions">
        <button
          type="button"
          className="btn-cta btn-secondary"
          onClick={captureLocation}
        >
          {coords ? "Refresh location" : "Use my location"}
        </button>
        <button type="submit" className="btn-cta btn-primary" disabled={pending}>
          {pending ? "Saving..." : submitLabel}
        </button>
      </div>
      {coords ? (
        <p className="ws-hr-meta">
          GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
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
