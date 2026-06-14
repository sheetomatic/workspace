"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Link2, QrCode, RefreshCw, Smartphone } from "lucide-react";
import {
  confirmMasWhatsAppOtp,
  fetchMasWhatsAppQr,
  refreshMasWhatsAppStatus,
  sendMasWhatsAppOtp,
} from "@/app/app/whatsapp/mas-actions";
import type { MasPhoneConnectionStatus } from "@/lib/integrations/messageautosender";

type LinkMode = "qr" | "otp";

export function MasWhatsAppConnectPanel({
  credentialsSaved,
  initialStatus,
}: {
  credentialsSaved: boolean;
  initialStatus: MasPhoneConnectionStatus | null;
}) {
  const [mode, setMode] = useState<LinkMode>("qr");
  const [status, setStatus] = useState<MasPhoneConnectionStatus | null>(initialStatus);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrMessage, setQrMessage] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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
    if (!credentialsSaved || mode !== "qr") {
      return;
    }
    loadQr();
    const interval = window.setInterval(() => {
      refreshStatus();
    }, 5000);
    return () => window.clearInterval(interval);
  }, [credentialsSaved, mode, loadQr, refreshStatus]);

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

      <div className="ws-mas-connect-tabs" role="tablist" aria-label="Link method">
        <button
          className={`ws-mas-connect-tab${mode === "qr" ? " is-active" : ""}`}
          role="tab"
          type="button"
          aria-selected={mode === "qr"}
          onClick={() => setMode("qr")}
        >
          <QrCode size={15} aria-hidden />
          Scan QR
        </button>
        <button
          className={`ws-mas-connect-tab${mode === "otp" ? " is-active" : ""}`}
          role="tab"
          type="button"
          aria-selected={mode === "otp"}
          onClick={() => setMode("otp")}
        >
          <Smartphone size={15} aria-hidden />
          OTP link
        </button>
      </div>

      {mode === "qr" ? (
        <div className="ws-mas-connect-panel">
          <p className="ws-wa-settings-lead">
            Open WhatsApp ? Linked devices ? Link a device ? Scan this code.
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
      ) : (
        <div className="ws-mas-connect-panel">
          <p className="ws-wa-settings-lead">
            Enter your WhatsApp number. We will send an OTP; enter it here to
            link your account.
          </p>
          <label>
            WhatsApp number
            <input
              inputMode="tel"
              placeholder="9685788980"
              type="tel"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
            />
          </label>
          {!otpSent ? (
            <button
              className="btn-cta btn-secondary"
              disabled={pending || !mobile.trim()}
              type="button"
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  setFeedback(null);
                  const result = await sendMasWhatsAppOtp(mobile);
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setOtpSent(true);
                  setFeedback(result.message);
                })
              }
            >
              <Link2 size={14} aria-hidden />
              Send OTP
            </button>
          ) : (
            <>
              <label>
                OTP code
                <input
                  inputMode="numeric"
                  placeholder="6-digit code"
                  type="text"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                />
              </label>
              <div className="ws-mas-connect-actions">
                <button
                  className="btn-cta btn-primary"
                  disabled={pending || !otp.trim()}
                  type="button"
                  onClick={() =>
                    startTransition(async () => {
                      setError(null);
                      setFeedback(null);
                      const result = await confirmMasWhatsAppOtp(mobile, otp);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setFeedback(result.message);
                      if (result.status) {
                        setStatus(result.status);
                      } else {
                        refreshStatus();
                      }
                    })
                  }
                >
                  Link WhatsApp
                </button>
                <button
                  className="btn-cta btn-secondary"
                  disabled={pending}
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp("");
                    setFeedback(null);
                  }}
                >
                  Resend OTP
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {feedback ? <p className="saas-form-message ok">{feedback}</p> : null}
      {error ? <p className="saas-form-message error">{error}</p> : null}
    </section>
  );
}
