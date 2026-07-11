"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  saveMetaLeadAdsConnection,
  saveTelegramLeadConnection,
  setWhatsAppLeadIngestEnabled,
  verifyMetaLeadAdsConnection,
} from "@/app/app/leads/actions";
import type { LeadSourceCardModel } from "@/lib/leads/source-settings";

const WA_OFFICIAL_SETTINGS_HREF = "/ai/app/settings#official-api";

function displayStatusLabel(card: LeadSourceCardModel): string {
  switch (card.status) {
    case "connected":
      return "Connected";
    case "error":
      return "Error";
    case "disabled":
      return "Disabled";
    case "needs_setup":
    default:
      return "Not connected";
  }
}

function StatusPill({ card }: { card: LeadSourceCardModel }) {
  return (
    <span className={`leads-source-status-pill is-${card.status}`}>
      {displayStatusLabel(card)}
    </span>
  );
}

function Feedback({
  message,
  error,
  lastSyncError,
}: {
  message: string | null;
  error: string | null;
  lastSyncError?: string | null;
}) {
  return (
    <>
      {message ? (
        <p className="leads-settings-notice is-success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="leads-settings-error" role="alert">
          {error}
        </p>
      ) : null}
      {lastSyncError ? (
        <p className="leads-settings-error" role="alert">
          Last sync: {lastSyncError}
        </p>
      ) : null}
    </>
  );
}

function CopyableWebhook({
  label,
  url,
  hint,
}: {
  label: string;
  url: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="leads-source-webhook-box">
      <div className="leads-source-webhook-row">
        <span className="leads-source-webhook-label">{label}</span>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <code className="leads-source-webhook-url">{url}</code>
      {hint ? <p className="leads-machine-muted">{hint}</p> : null}
    </div>
  );
}

function WhatsAppSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = card.status !== "needs_setup";
  const setupHref = card.setupHref ?? WA_OFFICIAL_SETTINGS_HREF;

  return (
    <article className="leads-settings-card leads-source-card">
      <div className="leads-settings-card-head">
        <h4>{card.label}</h4>
        <StatusPill card={card} />
      </div>
      <p className="leads-machine-muted">{card.description}</p>

      {ready ? (
        <p className="leads-settings-notice is-success">
          Using workspace Official API credentials.{" "}
          <Link href={setupHref}>Manage in WhatsApp settings</Link>
        </p>
      ) : (
        <p className="leads-settings-notice is-error">
          Official API credentials missing. Configure access token and phone
          number ID in{" "}
          <Link href={setupHref}>WhatsApp Official API settings</Link>, then
          return here to enable lead intake.
        </p>
      )}

      {card.fields.businessPhone ? (
        <p className="leads-machine-muted">
          Business number: {String(card.fields.businessPhone)}
        </p>
      ) : null}
      {card.fields.phoneNumberIdHint ? (
        <p className="leads-machine-muted">
          Phone number ID: {String(card.fields.phoneNumberIdHint)}
        </p>
      ) : null}

      {ready ? (
        <label className="leads-nurture-toggle">
          <input
            type="checkbox"
            checked={card.enabled}
            disabled={pending}
            onChange={(event) => {
              const enabled = event.target.checked;
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await setWhatsAppLeadIngestEnabled(enabled);
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else {
                  setError(result.message);
                }
              });
            }}
          />
          <span>
            {pending
              ? "Updating…"
              : "Enable Official API lead intake"}
          </span>
        </label>
      ) : null}

      <Feedback
        message={message}
        error={error}
        lastSyncError={card.lastSyncError}
      />
    </article>
  );
}

function MetaSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channel = card.channel as "FACEBOOK" | "INSTAGRAM";
  const hasSavedToken = Boolean(card.fields.pageAccessTokenHint);

  return (
    <article className="leads-settings-card leads-source-card">
      <div className="leads-settings-card-head">
        <h4>{card.label}</h4>
        <StatusPill card={card} />
      </div>
      <p className="leads-machine-muted">{card.description}</p>

      <form
        className="leads-source-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const form = new FormData(event.currentTarget);
          setMessage(null);
          setError(null);
          startTransition(async () => {
            const result = await saveMetaLeadAdsConnection({
              channel,
              enabled: form.get("enabled") === "on",
              pageId: String(form.get("pageId") ?? ""),
              pageAccessToken: String(form.get("pageAccessToken") ?? ""),
              verifyToken: String(form.get("verifyToken") ?? ""),
              formIds: String(form.get("formIds") ?? ""),
              appSecret: String(form.get("appSecret") ?? ""),
            });
            if (result.ok) {
              setMessage(result.message);
              router.refresh();
            } else {
              setError(result.message);
            }
          });
        }}
      >
        <fieldset disabled={pending} className="leads-source-fieldset">
          <label className="leads-settings-field">
            <span>Page ID</span>
            <input
              name="pageId"
              defaultValue={String(card.fields.pageId ?? "")}
              placeholder="Facebook Page ID"
              required
              autoComplete="off"
            />
          </label>
          <label className="leads-settings-field">
            <span>Page access token</span>
            <input
              name="pageAccessToken"
              type="password"
              placeholder={
                hasSavedToken
                  ? String(card.fields.pageAccessTokenHint)
                  : "Long-lived Page access token"
              }
              required={!hasSavedToken}
              autoComplete="off"
            />
            <small className="leads-machine-muted">
              {hasSavedToken
                ? "Leave blank to keep the saved token."
                : "Paste a long-lived Page access token from Meta."}
            </small>
          </label>
          <label className="leads-settings-field">
            <span>Webhook verify token</span>
            <input
              name="verifyToken"
              defaultValue={String(card.fields.verifyToken ?? "")}
              placeholder="Auto-generated if empty"
              autoComplete="off"
            />
            <small className="leads-machine-muted">
              Use the same string in Meta Developer Console → Webhooks → Verify
              token.
            </small>
          </label>
          <label className="leads-settings-field">
            <span>Form IDs (optional)</span>
            <input
              name="formIds"
              defaultValue={String(card.fields.formIds ?? "")}
              placeholder="Comma-separated; blank = all forms"
              autoComplete="off"
            />
          </label>
          <label className="leads-settings-field">
            <span>App secret (optional)</span>
            <input
              name="appSecret"
              type="password"
              placeholder={
                card.fields.hasAppSecret
                  ? "******** (leave blank to keep)"
                  : "For X-Hub-Signature-256"
              }
              autoComplete="off"
            />
          </label>

          {card.webhookUrl ? (
            <CopyableWebhook
              label="Callback URL"
              url={card.webhookUrl}
              hint="In Meta app Webhooks, subscribe to leadgen and paste this callback URL plus the verify token above."
            />
          ) : null}

          <label className="leads-nurture-toggle">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={card.enabled}
            />
            <span>Enable lead intake</span>
          </label>
        </fieldset>

        <div className="leads-source-actions">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => {
              if (pending) return;
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await verifyMetaLeadAdsConnection(channel);
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else {
                  setError(result.message);
                }
              });
            }}
          >
            {pending ? "Working…" : "Verify token"}
          </button>
        </div>
      </form>

      <Feedback
        message={message}
        error={error}
        lastSyncError={card.lastSyncError}
      />
    </article>
  );
}

function TelegramSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasSavedToken = Boolean(card.fields.botTokenHint);

  return (
    <article className="leads-settings-card leads-source-card">
      <div className="leads-settings-card-head">
        <h4>{card.label}</h4>
        <StatusPill card={card} />
      </div>
      <p className="leads-machine-muted">{card.description}</p>
      {card.fields.botUsername ? (
        <p className="leads-machine-muted">
          Bot: @{String(card.fields.botUsername)}
        </p>
      ) : null}

      <form
        className="leads-source-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending) return;
          const form = new FormData(event.currentTarget);
          setMessage(null);
          setError(null);
          startTransition(async () => {
            const result = await saveTelegramLeadConnection({
              enabled: form.get("enabled") === "on",
              botToken: String(form.get("botToken") ?? ""),
              registerWebhook: form.get("registerWebhook") === "on",
            });
            if (result.ok) {
              setMessage(result.message);
              router.refresh();
            } else {
              setError(result.message);
            }
          });
        }}
      >
        <fieldset disabled={pending} className="leads-source-fieldset">
          <label className="leads-settings-field">
            <span>Bot token</span>
            <input
              name="botToken"
              type="password"
              placeholder={
                hasSavedToken
                  ? String(card.fields.botTokenHint)
                  : "123456:ABC-DEF..."
              }
              required={!hasSavedToken}
              autoComplete="off"
            />
            <small className="leads-machine-muted">
              {hasSavedToken
                ? "Leave blank to keep the saved token."
                : "From @BotFather → /newbot or /token."}
            </small>
          </label>

          {card.webhookUrl ? (
            <CopyableWebhook
              label="Webhook URL"
              url={card.webhookUrl}
              hint="Saved when you connect. Prefer “Call Telegram setWebhook on save” so Telegram registers this URL automatically."
            />
          ) : (
            <p className="leads-machine-muted">
              Saving generates a unique webhook URL for this workspace. With
              setWebhook enabled, Telegram is registered automatically.
            </p>
          )}

          <label className="leads-nurture-toggle">
            <input
              type="checkbox"
              name="registerWebhook"
              defaultChecked
            />
            <span>Call Telegram setWebhook on save</span>
          </label>
          <label className="leads-nurture-toggle">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={card.enabled}
            />
            <span>Enable lead intake</span>
          </label>
        </fieldset>

        <div className="leads-source-actions">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save & verify"}
          </button>
        </div>
      </form>

      <Feedback
        message={message}
        error={error}
        lastSyncError={card.lastSyncError}
      />
    </article>
  );
}

export function LeadsSourceSettingsPanel({
  sources,
}: {
  sources: LeadSourceCardModel[];
}) {
  const byChannel = new Map(sources.map((item) => [item.channel, item]));
  const whatsapp = byChannel.get("WHATSAPP");
  const facebook = byChannel.get("FACEBOOK");
  const instagram = byChannel.get("INSTAGRAM");
  const telegram = byChannel.get("TELEGRAM");

  return (
    <section className="saas-panel leads-settings-card" id="lead-sources">
      <div className="leads-settings-card-head">
        <div>
          <h3>Lead sources</h3>
          <p className="leads-machine-muted">
            Google Sheets sync stays on the main Leads page. Connect Official
            WhatsApp intake, Meta Lead Ads, and Telegram here. Web Based API
            above is for nurture sends only.
          </p>
        </div>
      </div>

      <div className="leads-sources-grid">
        {whatsapp ? <WhatsAppSourceCard card={whatsapp} /> : null}
        {facebook ? <MetaSourceCard card={facebook} /> : null}
        {instagram ? <MetaSourceCard card={instagram} /> : null}
        {telegram ? <TelegramSourceCard card={telegram} /> : null}
      </div>
    </section>
  );
}
