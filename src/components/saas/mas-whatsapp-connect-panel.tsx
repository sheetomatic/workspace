"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import {
  fetchMasAccountDashboard,
  fetchMasWhatsAppQr,
} from "@/app/app/whatsapp/mas-actions";
import type {
  MasAccountDashboard,
  MasPhoneConnectionStatus,
} from "@/lib/integrations/messageautosender";

function channelStatusLabel(status: string, connected: boolean) {
  if (connected || status === "SUCCESS") {
    return "Connected";
  }
  if (status === "IMAGE_VISIBLE") {
    return "Scan QR";
  }
  if (status === "TRYING_TO_REACH_PHONE") {
    return "Connecting";
  }
  if (status === "USE_HERE") {
    return "Confirm on phone";
  }
  if (status === "RETRY") {
    return "Retry";
  }
  return "Not connected";
}

function qrHelperMessage(dashboard: MasAccountDashboard | null) {
  if (!dashboard) {
    return "Loading connection status...";
  }
  if (dashboard.connected) {
    return "WhatsApp is linked and ready to send messages.";
  }
  if (dashboard.channelStatus === "TRYING_TO_REACH_PHONE") {
    return "Connecting to your phone - keep WhatsApp open.";
  }
  if (dashboard.channelStatus === "USE_HERE") {
    return "Tap Use here on your phone, then refresh.";
  }
  if (dashboard.channelStatus === "RETRY") {
    return "Link expired - refresh the QR code.";
  }
  return "Please scan below image with WhatsApp Linked devices.";
}

function formatDashboardValue(value: string | number | null | undefined) {
  if (value == null || value === "") {
    return "-";
  }
  return String(value);
}

export function MasWhatsAppConnectPanel({
  credentialsSaved,
  initialStatus,
  initialDashboard = null,
}: {
  credentialsSaved: boolean;
  initialStatus: MasPhoneConnectionStatus | null;
  initialDashboard?: MasAccountDashboard | null;
}) {
  const [dashboard, setDashboard] = useState<MasAccountDashboard | null>(
    initialDashboard ??
      (initialStatus
        ? {
            channelId: initialStatus.channelId,
            accountType: null,
            validUntil: null,
            creditCount: null,
            channelStatus: initialStatus.status,
            connected: initialStatus.connected,
            statusMessage: initialStatus.message,
            phoneNumber: initialStatus.phoneNumber,
          }
        : null),
  );
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshDashboard = useCallback(() => {
    if (!credentialsSaved) {
      return;
    }
    startTransition(async () => {
      const result = await fetchMasAccountDashboard();
      if (result.ok) {
        setDashboard(result.dashboard);
        setError(null);
      } else {
        setError(result.error);
      }
    });
  }, [credentialsSaved]);

  const loadQr = useCallback(() => {
    if (!credentialsSaved) {
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await fetchMasWhatsAppQr();
      if (!result.ok) {
        setError(result.error ?? "Could not load QR code.");
        setQrImageUrl(null);
        return;
      }
      setQrImageUrl(result.qrImageUrl);
      if (result.message) {
        setDashboard((current) =>
          current
            ? { ...current, statusMessage: result.message }
            : current,
        );
      }
    });
  }, [credentialsSaved]);

  useEffect(() => {
    if (!credentialsSaved) {
      return;
    }
    refreshDashboard();
  }, [credentialsSaved, refreshDashboard]);

  useEffect(() => {
    if (!credentialsSaved || dashboard?.connected) {
      return;
    }
    loadQr();
    const interval = window.setInterval(() => {
      refreshDashboard();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [credentialsSaved, dashboard?.connected, loadQr, refreshDashboard]);

  if (!credentialsSaved) {
    return (
      <div className="ws-web-api-dashboard ws-web-api-dashboard-muted">
        <p>
          Save username, password, and API key above - your account dashboard
          and QR code appear here automatically.
        </p>
      </div>
    );
  }

  const channelLabel =
    dashboard?.channelId != null ? String(dashboard.channelId) : "-";
  const statusLabel = channelStatusLabel(
    dashboard?.channelStatus ?? "",
    dashboard?.connected ?? false,
  );

  return (
    <section className="ws-web-api-dashboard">
      <header className="ws-web-api-dashboard-head">
        <div>
          <h4>Status for channel: {channelLabel}</h4>
          <p>{qrHelperMessage(dashboard)}</p>
        </div>
        <span
          className={`ws-web-api-status-pill${dashboard?.connected ? " is-connected" : ""}`}
        >
          {statusLabel}
        </span>
      </header>

      {dashboard?.phoneNumber ? (
        <p className="ws-web-api-linked-phone">
          Linked number: <strong>{dashboard.phoneNumber}</strong>
        </p>
      ) : null}

      <div className="ws-web-api-qr-panel">
        <div className="ws-web-api-qr-frame">
          {dashboard?.connected ? (
            <div className="ws-web-api-qr-connected">
              WhatsApp linked
            </div>
          ) : qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt="WhatsApp QR code"
              className="ws-web-api-qr-image"
              src={qrImageUrl}
            />
          ) : (
            <div className="ws-web-api-qr-placeholder">
              {pending ? "Loading QR..." : "QR not loaded yet"}
            </div>
          )}
        </div>
        {dashboard?.statusMessage && !dashboard.connected ? (
          <p className="ws-field-hint">{dashboard.statusMessage}</p>
        ) : null}
      </div>

      <div className="ws-web-api-account-stats">
        <div className="ws-web-api-account-stat">
          <span>Account Type</span>
          <strong>{formatDashboardValue(dashboard?.accountType)}</strong>
        </div>
        <div className="ws-web-api-account-stat">
          <span>Valid Upto</span>
          <strong>{formatDashboardValue(dashboard?.validUntil)}</strong>
        </div>
        <div className="ws-web-api-account-stat">
          <span>Credit Count</span>
          <strong>{formatDashboardValue(dashboard?.creditCount)}</strong>
        </div>
      </div>

      <div className="ws-web-api-dashboard-actions">
        <button
          className="btn-cta btn-secondary"
          disabled={pending}
          type="button"
          onClick={() => {
            loadQr();
            refreshDashboard();
          }}
        >
          <RefreshCw size={14} aria-hidden />
          Refresh
        </button>
      </div>

      {error ? <p className="saas-form-message error">{error}</p> : null}
    </section>
  );
}
