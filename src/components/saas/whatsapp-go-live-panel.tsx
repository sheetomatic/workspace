"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Copy,
  Loader2,
  Radio,
  Send,
  Zap,
} from "lucide-react";
import {
  sendWhatsAppConnectionTest,
  toggleWhatsAppBotLive,
} from "@/app/app/whatsapp/actions";
import type { WhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <label className="ws-go-live-field">
      <span>{label}</span>
      <span className="ws-go-live-copy-row">
        <code>{value}</code>
        <button className="ws-go-live-copy-btn" type="button" onClick={copy}>
          <Copy size={14} aria-hidden />
          {copied ? "Copied" : "Copy"}
        </button>
      </span>
    </label>
  );
}

export function WhatsAppGoLivePanel({ status }: { status: WhatsAppGoLiveStatus }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  const steps = [
    {
      id: "api",
      title: "Connect WhatsApp API",
      description:
        "Your business number is on RedLava (official Meta API). Open Settings and save your Integration API key + Phone ID.",
      done: status.credentialsReady,
      note: status.phoneId
        ? `Phone ID ${status.phoneId}${status.businessPhone ? ` - ${status.businessPhone}` : ""}`
        : "Use Phone ID 1102997926228862 for +91 96857 88980",
    },
    {
      id: "webhook",
      title: "Register webhook",
      description:
        "In RedLava or Meta WhatsApp settings, point inbound messages to Sheetomatic (not the wchatter URL).",
      done: status.webhookReceived || status.verifyTokenConfigured,
      note: status.webhookReceived
        ? "Inbound webhook received"
        : status.verifyTokenHint,
    },
    {
      id: "team",
      title: "Add delegator numbers",
      description:
        "Managers and above can assign tasks via voice or text on WhatsApp.",
      done: status.delegatorCount > 0,
      note:
        status.delegatorCount > 0
          ? `${status.delegatorCount} authorized number(s)`
          : "Add WhatsApp numbers in Settings",
    },
  ];

  function runTest() {
    startTransition(async () => {
      const result = await sendWhatsAppConnectionTest();
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  function runGoLive(enable: boolean) {
    startTransition(async () => {
      const result = await toggleWhatsAppBotLive(enable);
      setMessage({ ok: result.ok, text: result.message });
    });
  }

  return (
    <section className="saas-panel ws-go-live-panel">
      <header className="ws-go-live-head">
        <div>
          <p className="ws-go-live-kicker">
            <Zap size={15} aria-hidden />
            Launch checklist
          </p>
          <h2>Connect WhatsApp and Go Live</h2>
          <p>
            Official WhatsApp Business API via RedLava - no QR scan needed. Your
            number is already connected; finish setup below and turn AI on.
          </p>
        </div>
        <span
          className={`ws-go-live-badge${status.isLive ? " is-live" : ""}`}
        >
          <Radio size={14} aria-hidden />
          {status.isLive ? "AI Live" : "Not live"}
        </span>
      </header>

      <ol className="ws-go-live-steps">
        {steps.map((step, index) => (
          <li className={step.done ? "is-done" : undefined} key={step.id}>
            <span className="ws-go-live-step-icon" aria-hidden>
              {step.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </span>
            <div>
              <strong>
                {index + 1}. {step.title}
              </strong>
              <p>{step.description}</p>
              <span className="ws-go-live-step-note">{step.note}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="ws-go-live-webhook">
        <h3>Webhook for RedLava / Meta</h3>
        <CopyField label="Callback URL" value={status.webhookUrl} />
        <p className="ws-go-live-hint">
          Verify token: set <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> on Vercel,
          then use the same string in Meta/RedLava webhook setup. Optional: add{" "}
          <code>META_APP_SECRET</code> from your Meta app Basic settings.
        </p>
        {status.lastInboundAt ? (
          <p className="ws-go-live-hint ok">
            Last inbound message:{" "}
            {new Date(status.lastInboundAt).toLocaleString("en-IN")}
          </p>
        ) : null}
      </div>

      {status.blockers.length > 0 && !status.isLive ? (
        <ul className="ws-go-live-blockers">
          {status.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}

      {message ? (
        <p className={`saas-form-message ${message.ok ? "ok" : "error"}`}>
          {message.text}
        </p>
      ) : null}

      <div className="ws-go-live-actions">
        <button
          className="btn-cta btn-secondary"
          disabled={pending || !status.credentialsReady}
          type="button"
          onClick={runTest}
        >
          {pending ? (
            <Loader2 className="animate-spin" size={16} aria-hidden />
          ) : (
            <Send size={16} aria-hidden />
          )}
          Send test message
        </button>

        {status.isLive ? (
          <button
            className="btn-cta btn-secondary"
            disabled={pending}
            type="button"
            onClick={() => runGoLive(false)}
          >
            Pause AI
          </button>
        ) : (
          <button
            className="btn-cta btn-primary"
            disabled={pending || !status.canGoLive}
            type="button"
            onClick={() => runGoLive(true)}
          >
            {pending ? (
              <Loader2 className="animate-spin" size={16} aria-hidden />
            ) : (
              <Zap size={16} aria-hidden />
            )}
            Go Live
          </button>
        )}
      </div>
    </section>
  );
}
