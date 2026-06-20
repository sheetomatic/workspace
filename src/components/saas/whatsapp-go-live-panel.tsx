"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Circle,
  Copy,
  Loader2,
  Send,
  Zap,
} from "lucide-react";
import {
  sendWhatsAppConnectionTest,
  toggleWhatsAppBotLive,
} from "@/app/app/whatsapp/actions";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";
import { SHEETOMATIC_WHATSAPP_PORTAL_URL } from "@/lib/integrations/redlava-portal";
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
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
    messageId?: string;
  } | null>(null);

  const portalHost = new URL(SHEETOMATIC_WHATSAPP_PORTAL_URL).host;

  const steps = [
    {
      id: "api",
      title: "Connect WhatsApp API",
      description: `Your business number uses the official Meta API via ${portalHost}. Open Settings and save your Integration API key + Phone ID.`,
      done: status.credentialsReady,
      note: status.phoneId
        ? `Phone ID ${status.phoneId}${status.businessPhone ? ` - ${status.businessPhone}` : ""}`
        : `Save your API key and Phone ID from ${portalHost} in Settings`,
    },
    {
      id: "webhook",
      title: "Register webhook",
      description:
        "In Sheetomatic WhatsApp or Meta settings, point inbound messages to the Sheetomatic callback URL below.",
      done: status.webhookReceived,
      note: status.webhookReceived
        ? "Inbound webhook received"
        : status.verifyTokenConfigured
          ? "Point webhook to the callback URL below - waiting for first message"
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
          : "Add WhatsApp numbers in Team settings",
    },
  ];

  function runTest() {
    startTransition(async () => {
      const result = await sendWhatsAppConnectionTest();
      setMessage({
        ok: result.ok,
        text: result.message,
        messageId: result.messageId,
      });
    });
  }

  function runGoLive(enable: boolean) {
    startTransition(async () => {
      const result = await toggleWhatsAppBotLive(enable);
      setMessage({ ok: result.ok, text: result.message, messageId: undefined });
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
            Official WhatsApp Business API via Sheetomatic ({portalHost}) - no QR
            scan needed. Finish setup below and turn AI on.
          </p>
        </div>
        <span
          className={`ws-go-live-badge${status.isLive ? " is-live" : ""}`}
        >
          <SheetomaticAiMark sizes="sm" />
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
        <h3>Webhook for Sheetomatic / Meta</h3>
        <CopyField label="Callback URL" value={status.webhookUrl} />
        <p className="ws-go-live-hint">
          Verify token: set <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> on Vercel,
          then use the same string in Meta or {portalHost} webhook setup. Optional:
          add <code>META_APP_SECRET</code> from your Meta app Basic settings.
        </p>
        {status.lastInboundAt ? (
          <p className="ws-go-live-hint ok">
            Last inbound message:{" "}
            {new Date(status.lastInboundAt).toLocaleString("en-IN")}
          </p>
        ) : null}
        <p className="ws-go-live-hint">
          Send test message delivers to <strong>your</strong> WhatsApp number from Team
          profile (not another manager).
        </p>
      </div>

      {status.blockers.length > 0 && !status.isLive ? (
        <ul className="ws-go-live-blockers">
          {status.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
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

      {message ? (
        message.ok ? (
          <div className="ws-go-live-feedback ok" role="status">
            <CheckCircle2 size={18} aria-hidden />
            <div className="ws-go-live-feedback-body">
              <p>{message.text}</p>
              {message.messageId ? (
                <details className="ws-go-live-feedback-details">
                  <summary>Message ID</summary>
                  <CopyField label="WhatsApp message ID" value={message.messageId} />
                </details>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="saas-form-message error ws-go-live-error" role="alert">
            {message.text}
          </p>
        )
      ) : null}
    </section>
  );
}
