"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { QrCode, RefreshCw } from "lucide-react";
import {
  fetchMasWhatsAppQr,
  refreshMasWhatsAppStatus,
} from "@/app/app/whatsapp/mas-actions";
import type { MasPhoneConnectionStatus } from "@/lib/integrations/messageautosender";

export function MasWhatsAppConnectPanel({
  credentialsSaved,
  initialStatus,
}: {
  credentialsSaved: boolean;
  initialStatus: MasPhoneConnectionStatus | null;
}) {
  const [status, setStatus] = useState<MasPhoneConnectionStatus | null>(initialStatus);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshStatus = useCallback(() => {
    if (!credentialsSaved) {
      return;
    }
    startTransition(async () => {
      const result = await refreshMasWhatsAppStatus();
      if (result.ok) {
        setStatus(result.status);
        if (result.status.connected) {
          setError(null);
          setFeedback("WhatsApp is linked and ready to send messages.");
        }
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
      setQrMessage(result.message);
    });
  }, [credentialsSaved]);

  useEffect(() => {
    if (!credentialsSaved) {
      return;
    }
    refreshStatus();
  }, [credentialsSaved, refreshStatus]);

  useEffect(() => {
    if (!credentialsSaved) {
      return;
    }
    loadQr();
    const interval = window.setInterval(() => {
      refreshStatus();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [credentialsSaved, loadQr, refreshStatus]);

  if (!credentialsSaved) {
    return (
      <div className="ws-mas-connect ws-mas-connect-muted">
        <p>
          Save username, password, and API key above - the Scan QR panel appears
          here automatically.
        </p>
      </div>
    );
  }

  return (
    <section className="ws-mas-connect">
      <div className="ws-mas-connect-head">
        <div>
          <h4>Scan to link WhatsApp</h4>
          <p>After saving credentials, scan the QR code with your phone.</p>
        </div>
        <span
          className={`ws-mas-connect-pill${status?.connected ? " is-connected" : ""}`}
        >
          {status?.connected ? "Connected" : "Not connected"}
        </span>
      </div>

      {status?.phoneNumber ? (
        <p className="ws-mas-connect-phone">
          Linked number: <strong>{status.phoneNumber}</strong>
        </p>
      ) : null}

      <div className="ws-mas-connect-panel">
        <p className="ws-wa-settings-lead">
          <QrCode size={15} aria-hidden className="inline-icon" /> Open WhatsApp
          on your phone, go to Linked devices, tap Link a device, then scan this
          code.
        </p>
        <div className="ws-mas-qr-frame">
          {qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="WhatsApp QR code" className="ws-mas-qr-image" src={qrImageUrl} />
          ) : (
            <div className="ws-mas-qr-placeholder">
              {pending ? "Loading QR..." : "QR not loaded yet"}
            </div>
          )}
        </div>
        {qrMessage ? <p className="ws-field-hint">{qrMessage}</p> : null}
        <div className="ws-mas-connect-actions">
          <button
            className="btn-cta btn-secondary"
            disabled={pending}
            type="button"
            onClick={loadQr}
          >
            <RefreshCw size={14} aria-hidden />
            Refresh QR
          </button>
          <button
            className="btn-cta btn-secondary"
            disabled={pending}
            type="button"
            onClick={refreshStatus}
          >
            Check status
          </button>
        </div>
      </div>

      {feedback ? <p className="saas-form-message ok">{feedback}</p> : null}
      {error ? <p className="saas-form-message error">{error}</p> : null}
    </section>
  );
}
