"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  saveIndiaMartLeadConnection,
  saveJustdialLeadConnection,
  saveMetaLeadAdsConnection,
  saveShopifyLeadConnection,
  saveTelegramLeadConnection,
  saveTradeIndiaLeadConnection,
  saveWooCommerceLeadConnection,
  saveVoiceLeadConnection,
  setWhatsAppLeadIngestEnabled,
  syncLeadChannelNow,
  verifyIndiaMartLeadConnection,
  verifyMetaLeadAdsConnection,
  verifyShopifyLeadConnection,
  verifyTradeIndiaLeadConnection,
  verifyWooCommerceLeadConnection,
  verifyVoiceLeadConnectionAction,
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
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => {
              if (pending) return;
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await syncLeadChannelNow(channel);
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else {
                  setError(result.message);
                }
              });
            }}
          >
            Sync now
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

function IndiaMartSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasKey = Boolean(card.fields.glusrCrmKeyHint);

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
            const result = await saveIndiaMartLeadConnection({
              enabled: form.get("enabled") === "on",
              glusrCrmKey: String(form.get("glusrCrmKey") ?? ""),
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
            <span>Pull API key (glusr_crm_key)</span>
            <input
              name="glusrCrmKey"
              type="password"
              placeholder={
                hasKey
                  ? String(card.fields.glusrCrmKeyHint)
                  : "From Lead Manager → Pull API"
              }
              required={!hasKey}
              autoComplete="off"
            />
            <small className="leads-machine-muted">
              {hasKey
                ? "Leave blank to keep the saved key."
                : "Seller portal → Lead Manager → Import/Export Leads → Pull API."}
            </small>
          </label>
          {card.webhookUrl ? (
            <CopyableWebhook
              label="Push API callback URL"
              url={card.webhookUrl}
              hint="In IndiaMART Push API choose Other and paste this URL. No Sheetomatic-held key."
            />
          ) : (
            <p className="leads-machine-muted">
              Saving generates a unique Push API URL for this workspace.
            </p>
          )}
          <label className="leads-nurture-toggle">
            <input type="checkbox" name="enabled" defaultChecked={card.enabled} />
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
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await verifyIndiaMartLeadConnection();
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else setError(result.message);
              });
            }}
          >
            Test pull
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => {
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await syncLeadChannelNow("INDIAMART");
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else setError(result.message);
              });
            }}
          >
            Sync now
          </button>
        </div>
      </form>
      <Feedback message={message} error={error} lastSyncError={card.lastSyncError} />
    </article>
  );
}

function TradeIndiaSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasKey = Boolean(card.fields.apiKeyHint);

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
            const result = await saveTradeIndiaLeadConnection({
              enabled: form.get("enabled") === "on",
              userId: String(form.get("userId") ?? ""),
              profileId: String(form.get("profileId") ?? ""),
              apiKey: String(form.get("apiKey") ?? ""),
            });
            if (result.ok) {
              setMessage(result.message);
              router.refresh();
            } else setError(result.message);
          });
        }}
      >
        <fieldset disabled={pending} className="leads-source-fieldset">
          <label className="leads-settings-field">
            <span>User ID</span>
            <input
              name="userId"
              defaultValue={String(card.fields.userId ?? "")}
              required={!card.fields.userId}
              autoComplete="off"
            />
          </label>
          <label className="leads-settings-field">
            <span>Profile ID</span>
            <input
              name="profileId"
              defaultValue={String(card.fields.profileId ?? "")}
              required={!card.fields.profileId}
              autoComplete="off"
            />
          </label>
          <label className="leads-settings-field">
            <span>Inquiry API key</span>
            <input
              name="apiKey"
              type="password"
              placeholder={hasKey ? String(card.fields.apiKeyHint) : "From My Inquiry API"}
              required={!hasKey}
              autoComplete="off"
            />
            <small className="leads-machine-muted">
              {hasKey
                ? "Leave blank to keep the saved key."
                : "TradeIndia → Inquiries & Contacts → My Inquiry API."}
            </small>
          </label>
          {card.webhookUrl ? (
            <CopyableWebhook
              label="Optional push URL"
              url={card.webhookUrl}
              hint="TradeIndia itself is pull-only. Use this URL only if a middleware posts JSON."
            />
          ) : null}
          <label className="leads-nurture-toggle">
            <input type="checkbox" name="enabled" defaultChecked={card.enabled} />
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
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await verifyTradeIndiaLeadConnection();
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else setError(result.message);
              });
            }}
          >
            Test pull
          </button>
        </div>
      </form>
      <Feedback message={message} error={error} lastSyncError={card.lastSyncError} />
    </article>
  );
}

function ShopifySourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasToken = Boolean(card.fields.accessTokenHint);

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
            const result = await saveShopifyLeadConnection({
              enabled: form.get("enabled") === "on",
              shopDomain: String(form.get("shopDomain") ?? ""),
              accessToken: String(form.get("accessToken") ?? ""),
              apiSecret: String(form.get("apiSecret") ?? ""),
              registerWebhook: form.get("registerWebhook") === "on",
            });
            if (result.ok) {
              setMessage(result.message);
              router.refresh();
            } else setError(result.message);
          });
        }}
      >
        <fieldset disabled={pending} className="leads-source-fieldset">
          <label className="leads-settings-field">
            <span>Shop domain</span>
            <input
              name="shopDomain"
              defaultValue={String(card.fields.shopDomain ?? "")}
              placeholder="your-store.myshopify.com"
              required
              autoComplete="off"
            />
          </label>
          <label className="leads-settings-field">
            <span>Admin API access token</span>
            <input
              name="accessToken"
              type="password"
              placeholder={
                hasToken
                  ? String(card.fields.accessTokenHint)
                  : "shpat_… from a custom app"
              }
              required={!hasToken}
              autoComplete="off"
            />
            <small className="leads-machine-muted">
              {hasToken
                ? "Leave blank to keep the saved token."
                : "Shopify admin → Settings → Apps → Develop apps → API credentials. Needs read_orders and read_customers."}
            </small>
          </label>
          <label className="leads-settings-field">
            <span>API secret (optional, webhook HMAC)</span>
            <input
              name="apiSecret"
              type="password"
              placeholder={
                card.fields.hasApiSecret
                  ? "******** (leave blank to keep)"
                  : "Custom app API secret key"
              }
              autoComplete="off"
            />
          </label>
          {card.webhookUrl ? (
            <CopyableWebhook
              label="Webhook URL"
              url={card.webhookUrl}
              hint="Registered automatically when “Register Shopify webhooks on save” is checked."
            />
          ) : null}
          <label className="leads-nurture-toggle">
            <input type="checkbox" name="registerWebhook" defaultChecked />
            <span>Register Shopify webhooks on save</span>
          </label>
          <label className="leads-nurture-toggle">
            <input type="checkbox" name="enabled" defaultChecked={card.enabled} />
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
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await verifyShopifyLeadConnection();
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else setError(result.message);
              });
            }}
          >
            Test token
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={() => {
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await syncLeadChannelNow("SHOPIFY");
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else setError(result.message);
              });
            }}
          >
            Sync now
          </button>
        </div>
      </form>
      <Feedback message={message} error={error} lastSyncError={card.lastSyncError} />
    </article>
  );
}

function WooCommerceSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasKey = Boolean(card.fields.consumerKeyHint);

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
            const result = await saveWooCommerceLeadConnection({
              enabled: form.get("enabled") === "on",
              storeUrl: String(form.get("storeUrl") ?? ""),
              consumerKey: String(form.get("consumerKey") ?? ""),
              consumerSecret: String(form.get("consumerSecret") ?? ""),
              registerWebhook: form.get("registerWebhook") === "on",
            });
            if (result.ok) {
              setMessage(result.message);
              router.refresh();
            } else setError(result.message);
          });
        }}
      >
        <fieldset disabled={pending} className="leads-source-fieldset">
          <label className="leads-settings-field">
            <span>Store URL</span>
            <input
              name="storeUrl"
              defaultValue={String(card.fields.storeUrl ?? "")}
              placeholder="https://yourstore.com"
              required
              autoComplete="off"
            />
          </label>
          <label className="leads-settings-field">
            <span>Consumer key</span>
            <input
              name="consumerKey"
              type="password"
              placeholder={
                hasKey ? String(card.fields.consumerKeyHint) : "ck_…"
              }
              required={!hasKey}
              autoComplete="off"
            />
          </label>
          <label className="leads-settings-field">
            <span>Consumer secret</span>
            <input
              name="consumerSecret"
              type="password"
              placeholder={
                card.fields.hasConsumerSecret
                  ? "******** (leave blank to keep)"
                  : "cs_…"
              }
              required={!card.fields.hasConsumerSecret}
              autoComplete="off"
            />
          </label>
          {card.webhookUrl ? (
            <CopyableWebhook
              label="Webhook URL"
              url={card.webhookUrl}
              hint="Registered as order.created when the checkbox below is on."
            />
          ) : null}
          <label className="leads-nurture-toggle">
            <input type="checkbox" name="registerWebhook" defaultChecked />
            <span>Register WooCommerce webhook on save</span>
          </label>
          <label className="leads-nurture-toggle">
            <input type="checkbox" name="enabled" defaultChecked={card.enabled} />
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
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await verifyWooCommerceLeadConnection();
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else setError(result.message);
              });
            }}
          >
            Test keys
          </button>
        </div>
      </form>
      <Feedback message={message} error={error} lastSyncError={card.lastSyncError} />
    </article>
  );
}

function JustdialSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            const result = await saveJustdialLeadConnection({
              enabled: form.get("enabled") === "on",
            });
            if (result.ok) {
              setMessage(result.message);
              router.refresh();
            } else setError(result.message);
          });
        }}
      >
        <fieldset disabled={pending} className="leads-source-fieldset">
          {card.webhookUrl ? (
            <CopyableWebhook
              label="Justdial webhook URL (GET)"
              url={card.webhookUrl}
              hint="Send this URL to your Justdial account manager. They configure GET leadid, name, mobile, email, city, category."
            />
          ) : (
            <p className="leads-machine-muted">
              Save to generate a unique webhook URL for this workspace.
            </p>
          )}
          <label className="leads-nurture-toggle">
            <input type="checkbox" name="enabled" defaultChecked={card.enabled} />
            <span>Enable lead intake</span>
          </label>
        </fieldset>
        <div className="leads-source-actions">
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
      <Feedback message={message} error={error} lastSyncError={card.lastSyncError} />
    </article>
  );
}

function fieldString(card: LeadSourceCardModel, key: string) {
  const value = card.fields[key];
  return typeof value === "string" && value.trim() ? value : "";
}

function VoiceSourceCard({ card }: { card: LeadSourceCardModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState(
    fieldString(card, "provider") || "EXOTEL",
  );
  const twimlUrl = fieldString(card, "twimlUrl");

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
            const result = await saveVoiceLeadConnection({
              enabled: form.get("enabled") === "on",
              provider: String(form.get("provider") ?? ""),
              clinicName: String(form.get("clinicName") ?? ""),
              openaiApiKey: String(form.get("openaiApiKey") ?? ""),
              exotelSid: String(form.get("exotelSid") ?? ""),
              exotelApiKey: String(form.get("exotelApiKey") ?? ""),
              exotelApiToken: String(form.get("exotelApiToken") ?? ""),
              exotelSubdomain: String(form.get("exotelSubdomain") ?? ""),
              exotelCallerId: String(form.get("exotelCallerId") ?? ""),
              exotelAppId: String(form.get("exotelAppId") ?? ""),
              twilioAccountSid: String(form.get("twilioAccountSid") ?? ""),
              twilioAuthToken: String(form.get("twilioAuthToken") ?? ""),
              twilioFromNumber: String(form.get("twilioFromNumber") ?? ""),
              knowlarityApiKey: String(form.get("knowlarityApiKey") ?? ""),
              knowlarityAuth: String(form.get("knowlarityAuth") ?? ""),
              knowlarityKNumber: String(form.get("knowlarityKNumber") ?? ""),
              knowlarityAgentNumber: String(
                form.get("knowlarityAgentNumber") ?? "",
              ),
            });
            if (result.ok) {
              setMessage(result.message);
              router.refresh();
            } else setError(result.message);
          });
        }}
      >
        <fieldset disabled={pending} className="leads-source-fieldset">
          <label className="leads-settings-field">
            <span>Clinic name (spoken on the call)</span>
            <input
              name="clinicName"
              type="text"
              defaultValue={fieldString(card, "clinicName")}
              placeholder="Sharma Clinic"
              autoComplete="off"
            />
          </label>
          <label className="leads-settings-field">
            <span>Voice provider</span>
            <select
              name="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            >
              <option value="EXOTEL">Exotel</option>
              <option value="TWILIO">Twilio</option>
              <option value="KNOWLARITY">Knowlarity</option>
            </select>
          </label>
          {provider === "EXOTEL" ? (
            <>
              <label className="leads-settings-field">
                <span>API key</span>
                <input
                  name="exotelApiKey"
                  type="password"
                  placeholder={
                    fieldString(card, "exotelApiKeyHint") || "Exotel API key"
                  }
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>API token</span>
                <input
                  name="exotelApiToken"
                  type="password"
                  placeholder="Leave blank to keep the saved token"
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>Account SID</span>
                <input
                  name="exotelSid"
                  type="text"
                  placeholder={
                    fieldString(card, "exotelSidHint") || "Exotel Account SID"
                  }
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>Subdomain</span>
                <input
                  name="exotelSubdomain"
                  type="text"
                  defaultValue={
                    fieldString(card, "exotelSubdomain") || "api.exotel.com"
                  }
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>ExoPhone (caller ID)</span>
                <input
                  name="exotelCallerId"
                  type="text"
                  defaultValue={fieldString(card, "exotelCallerId")}
                  placeholder="0xxxxxxxxxx"
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>App ID (optional ExoML applet)</span>
                <input
                  name="exotelAppId"
                  type="text"
                  defaultValue={fieldString(card, "exotelAppId")}
                  autoComplete="off"
                />
              </label>
            </>
          ) : null}
          {provider === "TWILIO" ? (
            <>
              <label className="leads-settings-field">
                <span>Account SID</span>
                <input
                  name="twilioAccountSid"
                  type="text"
                  placeholder={
                    fieldString(card, "twilioAccountSidHint") || "ACxxxx"
                  }
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>Auth Token</span>
                <input
                  name="twilioAuthToken"
                  type="password"
                  placeholder="Leave blank to keep the saved token"
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>From number</span>
                <input
                  name="twilioFromNumber"
                  type="text"
                  defaultValue={fieldString(card, "twilioFromNumber")}
                  placeholder="+91xxxxxxxxxx"
                  autoComplete="off"
                />
              </label>
            </>
          ) : null}
          {provider === "KNOWLARITY" ? (
            <>
              <label className="leads-settings-field">
                <span>API key (x-api-key)</span>
                <input
                  name="knowlarityApiKey"
                  type="password"
                  placeholder={
                    fieldString(card, "knowlarityApiKeyHint") ||
                    "Knowlarity API key"
                  }
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>Authorization header</span>
                <input
                  name="knowlarityAuth"
                  type="password"
                  placeholder="Leave blank to keep the saved value"
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>k-number (DID)</span>
                <input
                  name="knowlarityKNumber"
                  type="text"
                  defaultValue={fieldString(card, "knowlarityKNumber")}
                  placeholder="+91xxxxxxxxxx"
                  autoComplete="off"
                />
              </label>
              <label className="leads-settings-field">
                <span>Agent / clinic number (optional)</span>
                <input
                  name="knowlarityAgentNumber"
                  type="text"
                  defaultValue={fieldString(card, "knowlarityAgentNumber")}
                  autoComplete="off"
                />
              </label>
            </>
          ) : null}
          <label className="leads-settings-field">
            <span>OpenAI API key (optional)</span>
            <input
              name="openaiApiKey"
              type="password"
              placeholder={
                card.fields.hasOpenaiKey
                  ? String(card.fields.openaiApiKeyHint || "Saved · leave blank to keep")
                  : "sk-… for Whisper confirm parse"
              }
              autoComplete="off"
            />
            <small className="leads-machine-muted">
              Used to transcribe the recording. Press-1 confirm works without it.
              Platform OPENAI_API_KEY is only a fallback.
            </small>
          </label>
          {card.webhookUrl ? (
            <CopyableWebhook
              label="Status / recording webhook"
              url={card.webhookUrl}
              hint="Paste this as the status and recording callback. Org is resolved from this secret — never send organizationId."
            />
          ) : (
            <p className="leads-machine-muted">
              Saving generates a unique webhook URL for this workspace.
            </p>
          )}
          {provider === "TWILIO" && twimlUrl ? (
            <CopyableWebhook
              label="Twilio voice URL (TwiML)"
              url={twimlUrl}
              hint="Use this as the Twilio call Url. Greeting asks the patient to press 1 or speak the visit time."
            />
          ) : null}
          <label className="leads-nurture-toggle">
            <input type="checkbox" name="enabled" defaultChecked={card.enabled} />
            <span>Enable AI receptionist calls</span>
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
              setMessage(null);
              setError(null);
              startTransition(async () => {
                const result = await verifyVoiceLeadConnectionAction();
                if (result.ok) {
                  setMessage(result.message);
                  router.refresh();
                } else setError(result.message);
              });
            }}
          >
            Test
          </button>
        </div>
      </form>
      <Feedback message={message} error={error} lastSyncError={card.lastSyncError} />
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
  const indiamart = byChannel.get("INDIAMART");
  const tradeindia = byChannel.get("TRADEINDIA");
  const shopify = byChannel.get("SHOPIFY");
  const woocommerce = byChannel.get("WOOCOMMERCE");
  const justdial = byChannel.get("JUSTDIAL");
  const voice = byChannel.get("VOICE");

  return (
    <section className="saas-panel leads-settings-card" id="lead-sources">
      <div className="leads-settings-card-head">
        <div>
          <h3>Lead sources</h3>
          <p className="leads-machine-muted">
            Paste each source’s own keys here — nothing waits on a Sheetomatic-held
            credential. Save, test, and enable independently. Google Sheets stays
            on the main Leads page. Web Based API above is for nurture sends only.
          </p>
        </div>
      </div>

      <div className="leads-sources-grid">
        {voice ? <VoiceSourceCard card={voice} /> : null}
        {whatsapp ? <WhatsAppSourceCard card={whatsapp} /> : null}
        {facebook ? <MetaSourceCard card={facebook} /> : null}
        {instagram ? <MetaSourceCard card={instagram} /> : null}
        {indiamart ? <IndiaMartSourceCard card={indiamart} /> : null}
        {tradeindia ? <TradeIndiaSourceCard card={tradeindia} /> : null}
        {justdial ? <JustdialSourceCard card={justdial} /> : null}
        {shopify ? <ShopifySourceCard card={shopify} /> : null}
        {woocommerce ? <WooCommerceSourceCard card={woocommerce} /> : null}
        {telegram ? <TelegramSourceCard card={telegram} /> : null}
      </div>
    </section>
  );
}
