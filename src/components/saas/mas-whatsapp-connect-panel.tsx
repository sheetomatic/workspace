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
  if (connected || status === "SUCCESS") return "Connected";
  if (status === "IMAGE_VISIBLE") return "Scan QR";
  if (status === "TRYING_TO_REACH_PHONE") return "Connecting";
  if (status === "USE_HERE") return "Confirm on phone";
  if (status === "RETRY") return "Retry";
  return "Not connected";
}

function qrHelperMessage(dashboard: MasAccountDashboard | null, compact: boolean) {
  if (!dashboard) return compact ? "Save credentials to load QR." : "Loading...";
  if (dashboard.connected) return "WhatsApp linked.";
  if (dashboard.channelStatus === "TRYING_TO_REACH_PHONE") return "Connecting - keep WhatsApp open.";
  if (dashboard.channelStatus === "USE_HERE") return "Tap Use here on your phone.";
  if (dashboard.channelStatus === "RETRY") return "QR expired - refresh.";
  return "Scan with WhatsApp Linked devices.";
}

export function MasWhatsAppConnectPanel({
  credentialsSaved,
  initialStatus,
  initialDashboard = null,
  compact = false,
}: {
  credentialsSaved: boolean;
  initialStatus: MasPhoneConnectionStatus | null;
  initialDashboard?: MasAccountDashboard | null;
  compact?: boolean;
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
    if (!credentialsSaved) return;
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
    if (!credentialsSaved) return;
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
          current ? { ...current, statusMessage: result.message } : current,
        );
      }
    });
  }, [credentialsSaved]);

  useEffect(() => {
    if (!credentialsSaved) return;
    refreshDashboard();
  }, [credentialsSaved, refreshDashboard]);

  useEffect(() => {
    if (!credentialsSaved || dashboard?.connected) return;
    loadQr();
    const interval = window.setInterval(refreshDashboard, 5000);
    return () => window.clearInterval(interval);
  }, [credentialsSaved, dashboard?.connected, loadQr, refreshDashboard]);

  const statusLabel = channelStatusLabel(
    dashboard?.channelStatus ?? "",
    dashboard?.connected ?? false,
  );

  if (!credentialsSaved) {
    return (
      <div className={`ws-web-api-qr-block${compact ? " is-compact" : ""}`}>
        <div className="ws-web-api-qr-frame is-placeholder">
          <span className="ws-web-api-qr-placeholder-text">QR code</span>
          <p>Save Web Based API credentials, then scan here.</p>
        </div>
      </div>
    );
  }

  return (
    <section className={`ws-web-api-dashboard${compact ? " is-compact" : ""}`}>
      {!compact ? (
        <header className="ws-web-api-dashboard-head">
          <div>
            <h4>
              Status for channel:{" "}
              {dashboard?.channelId != null ? dashboard.channelId : "-"}
            </h4>
            <p>{qrHelperMessage(dashboard, false)}</p>
          </div>
          <span
            className={`ws-web-api-status-pill${dashboard?.connected ? " is-connected" : ""}`}
          >
            {statusLabel}
          </span>
        </header>
      ) : null}

      <div className="ws-web-api-qr-block is-compact">
        {compact ? (
          <div className="ws-web-api-qr-block-head">
            <div>
              <strong>Connect Web WA</strong>
              <p>{qrHelperMessage(dashboard, true)}</p>
            </div>
            <span
              className={`ws-web-api-status-pill${dashboard?.connected ? " is-connected" : ""}`}
            >
              {statusLabel}
            </span>
          </div>
        ) : null}

        <div className="ws-web-api-qr-row">
          <div className="ws-web-api-qr-frame">
            {dashboard?.connected ? (
              <div className="ws-web-api-qr-connected">Linked</div>
            ) : qrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="WhatsApp QR code"
                className="ws-web-api-qr-image"
                src={qrImageUrl}
              />
            ) : (
              <div className="ws-web-api-qr-placeholder">
                {pending ? "Loading..." : "No QR yet"}
              </div>
            )}
          </div>

          {compact ? (
            <div className="ws-web-api-qr-side">
              {dashboard?.phoneNumber ? (
                <p className="ws-web-api-linked-phone">
                  <strong>{dashboard.phoneNumber}</strong>
                </p>
              ) : null}
              <p className="ws-field-hint">
                Open WhatsApp &rarr; Linked devices &rarr; Link a device.
              </p>
              <button
                className="btn-cta btn-secondary btn-sm"
                disabled={pending}
                type="button"
                onClick={() => {
                  loadQr();
                  refreshDashboard();
                }}
              >
                <RefreshCw size={13} aria-hidden />
                Refresh QR
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="saas-form-message error">{error}</p> : null}
    </section>
  );
}
