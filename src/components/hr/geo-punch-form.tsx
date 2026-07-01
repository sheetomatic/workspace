"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type GeoPunchFormProps = {
  action: (formData: FormData) => Promise<void>;
  children?: React.ReactNode;
  submitLabel: string;
  requireGeo?: boolean;
  successMessage?: string;
};

export function GeoPunchForm({
  action,
  children,
  submitLabel,
  requireGeo = false,
  successMessage = "Saved.",
}: GeoPunchFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
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
    if (requireGeo && !coords) {
      setMessage("Capture location before submitting.");
      setIsError(true);
      setPending(false);
      return;
    }
    try {
      await action(formData);
      setMessage(successMessage);
      setIsError(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save. Try again.",
      );
      setIsError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ws-hr-form">
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
