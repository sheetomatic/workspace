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

function StatusPill({
  status,
  label,
}: {
  status: LeadSourceCardModel["status"];
  label: string;
}) {
  return (
    <span className={`leads-source-status-pill is-${status}`}>{label}</span>
  );
}

function WhatsAppSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = card.status !== "needs_setup";

  return (
    <article className="leads-settings-card leads-source-card">
      <div className="leads-settings-card-head">
        <h4>{card.label}</h4>
        <StatusPill status={card.status} label={card.statusLabel} />
      </div>
      <p className="leads-machine-muted">{card.description}</p>
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

      {!ready ? (
        <p className="leads-settings-notice is-error">
          Official API credentials missing.{" "}
          <Link href={card.setupHref ?? "/ai/app/settings#official-api"}>
            Open WhatsApp Official API settings
          </Link>
          .
        </p>
      ) : (
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
          <span>Enable Official API lead intake</span>
        </label>
      )}

      {message ? (
        <p className="leads-settings-notice is-success">{message}</p>
      ) : null}
      {error ? <p className="leads-settings-error">{error}</p> : null}
      {card.lastSyncError ? (
        <p className="leads-settings-error">{card.lastSyncError}</p>
      ) : null}
    </article>
  );
}

function MetaSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const channel = card.channel as "FACEBOOK" | "INSTAGRAM";

  return (
    <article className="leads-settings-card leads-source-card">
      <div className="leads-settings-card-head">
        <h4>{card.label}</h4>
        <StatusPill status={card.status} label={card.statusLabel} />
      </div>
      <p className="leads-machine-muted">{card.description}</p>

      <form
        className="leads-source-form"
        onSubmit={(event) => {
          event.preventDefault();
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
              setMessage(
                result.webhookUrl
                  ? `${result.message} Webhook: ${result.webhookUrl}`
                  : result.message,
              );
              router.refresh();
            } else {
              setError(result.message);
            }
          });
        }}
      >
        <label className="leads-settings-field">
          <span>Page ID</span>
          <input
            name="pageId"
            defaultValue={String(card.fields.pageId ?? "")}
            placeholder="Facebook Page ID"
            required
          />
        </label>
        <label className="leads-settings-field">
          <span>Page access token</span>
          <input
            name="pageAccessToken"
            type="password"
            placeholder={
              card.fields.pageAccessTokenHint
                ? String(card.fields.pageAccessTokenHint)
                : "Long-lived Page access token"
            }
            autoComplete="off"
          />
          <small className="leads-machine-muted">
            Leave blank to keep the saved token.
          </small>
        </label>
        <label className="leads-settings-field">
          <span>Webhook verify token</span>
          <input
            name="verifyToken"
            defaultValue={String(card.fields.verifyToken ?? "")}
            placeholder="Auto-generated if empty"
          />
        </label>
        <label className="leads-settings-field">
          <span>Form IDs (optional)</span>
          <input
            name="formIds"
            defaultValue={String(card.fields.formIds ?? "")}
            placeholder="Comma-separated; blank = all forms"
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
          <p className="leads-source-webhook">
            Callback URL: <code>{card.webhookUrl}</code>
          </p>
        ) : null}
        <label className="leads-nurture-toggle">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={card.enabled}
          />
          <span>Enable lead intake</span>
        </label>
        <div className="leads-source-actions">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => {
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
            Verify token
          </button>
        </div>
      </form>

      {message ? (
        <p className="leads-settings-notice is-success">{message}</p>
      ) : null}
      {error ? <p className="leads-settings-error">{error}</p> : null}
      {card.lastSyncError ? (
        <p className="leads-settings-error">{card.lastSyncError}</p>
      ) : null}
    </article>
  );
}

function TelegramSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <article className="leads-settings-card leads-source-card">
      <div className="leads-settings-card-head">
        <h4>{card.label}</h4>
        <StatusPill status={card.status} label={card.statusLabel} />
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
              setMessage(
                result.webhookUrl
                  ? `${result.message} Webhook: ${result.webhookUrl}`
                  : result.message,
              );
              router.refresh();
            } else {
              setError(result.message);
            }
          });
        }}
      >
        <label className="leads-settings-field">
          <span>Bot token</span>
          <input
            name="botToken"
            type="password"
            placeholder={
              card.fields.botTokenHint
                ? String(card.fields.botTokenHint)
                : "123456:ABC-DEF..."
            }
            autoComplete="off"
          />
          <small className="leads-machine-muted">
            Leave blank to keep the saved token.
          </small>
        </label>
        {card.webhookUrl ? (
          <p className="leads-source-webhook">
            Webhook URL: <code>{card.webhookUrl}</code>
          </p>
        ) : (
          <p className="leads-machine-muted">
            Saving generates a unique webhook URL for this workspace.
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
        <div className="leads-source-actions">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save & verify"}
          </button>
        </div>
      </form>

      {message ? (
        <p className="leads-settings-notice is-success">{message}</p>
      ) : null}
      {error ? <p className="leads-settings-error">{error}</p> : null}
      {card.lastSyncError ? (
        <p className="leads-settings-error">{card.lastSyncError}</p>
      ) : null}
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
