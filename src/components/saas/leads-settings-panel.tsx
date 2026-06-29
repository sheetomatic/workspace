"use client";

import { useState, useTransition } from "react";
import type { LeadSourceChannel } from "@prisma/client";
import Link from "next/link";
import {
  regenerateLeadsApiKey,
  syncLeadChannelNow,
  testGoogleSheetsLeadConnection,
  updateGoogleSheetsLeadConfig,
} from "@/app/app/leads/actions";
import { GoogleSheetsSetupSteps } from "@/components/saas/leads-google-sheets-setup";
import {
  isLeadSourceComingSoon,
  LEAD_CHANNEL_LABELS,
  LEAD_SOURCE_PRIORITY_CHANNEL,
} from "@/lib/leads/channels";
import {
  DEFAULT_LEADS_SHEET_TAB,
  DEFAULT_LEADS_SPREADSHEET_URL,
} from "@/lib/leads/sheet-config";
import "@/components/saas/leads-machine.css";

type ConnectionRow = {
  id: string;
  channel: LeadSourceChannel;
  label: string;
  enabled: boolean;
  config: unknown;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  syncStatus: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

export function LeadsSettingsPanel({
  connections,
  apiKeyHint,
  ingestUrl,
  sheetsAuthConfigured,
  serviceAccountEmail,
}: {
  connections: ConnectionRow[];
  apiKeyHint: string | null;
  ingestUrl: string;
  sheetsAuthConfigured: boolean;
  serviceAccountEmail: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  return (
    <div className="saas-page leads-settings-page">
      <header className="saas-page-head leads-settings-head">
        <div>
          <Link className="btn-secondary btn-sm" href="/app/leads">
            ← Back to leads
          </Link>
          <h1>Google Sheets setup</h1>
          <p>Connect your form responses sheet. Sync runs automatically every 15 minutes.</p>
        </div>
      </header>

      {notice ? (
        <div className={`leads-settings-notice is-${notice.type}`}>{notice.message}</div>
      ) : null}

      <div className="leads-settings-grid">
        {connections
          .slice()
          .sort((a, b) => {
            if (a.channel === LEAD_SOURCE_PRIORITY_CHANNEL) return -1;
            if (b.channel === LEAD_SOURCE_PRIORITY_CHANNEL) return 1;
            return a.channel.localeCompare(b.channel);
          })
          .map((connection) =>
            connection.channel === LEAD_SOURCE_PRIORITY_CHANNEL ? (
              <GoogleSheetsConnectionCard
                key={connection.id}
                connection={connection}
                disabled={pending}
                sheetsAuthConfigured={sheetsAuthConfigured}
                serviceAccountEmail={serviceAccountEmail}
                onSave={(payload) =>
                  startTransition(async () => {
                    const result = await updateGoogleSheetsLeadConfig(payload);
                    setNotice({
                      type: result.ok ? "success" : "error",
                      message: result.message ?? (result.ok ? "Saved." : "Save failed."),
                    });
                  })
                }
                onSync={() =>
                  startTransition(async () => {
                    const result = await syncLeadChannelNow(connection.channel);
                    setNotice({
                      type: result.ok ? "success" : "error",
                      message: result.message ?? (result.ok ? "Synced." : "Sync failed."),
                    });
                  })
                }
                onTest={(payload) =>
                  startTransition(async () => {
                    const result = await testGoogleSheetsLeadConnection(payload);
                    setNotice({
                      type: result.ok ? "success" : "error",
                      message: result.message,
                    });
                  })
                }
              />
            ) : isLeadSourceComingSoon(connection.channel) ? (
              <ComingSoonConnectionCard key={connection.id} connection={connection} />
            ) : null,
          )}
      </div>

      <section className="saas-panel leads-settings-api">
        <details>
          <summary>Ingest API (advanced)</summary>
        <p className="leads-machine-muted">
          POST leads from any system to <code>{ingestUrl}</code>
        </p>
        <p className="leads-machine-muted">
          Header: <code>Authorization: Bearer &lt;api-key&gt;</code>
        </p>
        {apiKeyHint ? (
          <p className="leads-machine-muted">Current key ends with: ...{apiKeyHint}</p>
        ) : (
          <p className="leads-machine-muted">No API key generated yet.</p>
        )}
        {freshKey ? <div className="leads-api-key">{freshKey}</div> : null}
        <button
          type="button"
          className="btn-primary mt-4"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await regenerateLeadsApiKey();
              if (result.ok && result.apiKey) {
                setFreshKey(result.apiKey);
              }
            })
          }
        >
          {apiKeyHint ? "Regenerate API key" : "Generate API key"}
        </button>
        </details>
      </section>
    </div>
  );
}

function GoogleSheetsConnectionCard({
  connection,
  disabled,
  sheetsAuthConfigured,
  serviceAccountEmail,
  onSave,
  onSync,
  onTest,
}: {
  connection: ConnectionRow;
  disabled: boolean;
  sheetsAuthConfigured: boolean;
  serviceAccountEmail: string | null;
  onSave: (payload: {
    enabled: boolean;
    spreadsheetUrl: string;
    sheetTab: string;
    headerRow: number;
  }) => void;
  onSync: () => void;
  onTest: (payload: {
    spreadsheetUrl: string;
    sheetTab: string;
    headerRow: number;
  }) => void;
}) {
  const config =
    connection.config && typeof connection.config === "object"
      ? (connection.config as Record<string, unknown>)
      : {};

  const [enabled, setEnabled] = useState(connection.enabled);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(
    typeof config.spreadsheetUrl === "string"
      ? config.spreadsheetUrl
      : DEFAULT_LEADS_SPREADSHEET_URL,
  );
  const [sheetTab, setSheetTab] = useState(
    typeof config.sheetTab === "string" ? config.sheetTab : DEFAULT_LEADS_SHEET_TAB,
  );
  const [headerRow, setHeaderRow] = useState(
    typeof config.headerRow === "number" ? String(config.headerRow) : "1",
  );

  const formPayload = () => ({
    enabled,
    spreadsheetUrl,
    sheetTab,
    headerRow: Number.parseInt(headerRow, 10) || 1,
  });

  const isLive =
    connection.enabled &&
    Boolean(connection.lastSyncAt) &&
    !connection.lastSyncError &&
    connection.syncStatus !== "ERROR";

  const lastSyncLabel = connection.lastSyncAt
    ? new Date(connection.lastSyncAt).toLocaleString("en-IN")
    : "Never";

  return (
    <article className="leads-settings-card leads-settings-card-priority">
      <div className="leads-settings-card-head">
        <h3>{LEAD_CHANNEL_LABELS.GOOGLE_SHEETS}</h3>
        <span className={isLive ? "leads-priority-badge" : "leads-coming-soon-badge"}>
          {isLive ? "Live" : connection.lastSyncError ? "Error" : "Setup"}
        </span>
      </div>

      <p className="leads-settings-sync-line">
        Last sync: <strong>{lastSyncLabel}</strong> · Auto every 15 min
      </p>
      <p className="leads-machine-muted">
        Service account: {sheetsAuthConfigured ? "configured on server" : "missing on server"}
        {serviceAccountEmail ? (
          <>
            {" "}
            (<code>{serviceAccountEmail}</code>)
          </>
        ) : null}
      </p>

      <details className="leads-settings-guide">
        <summary>Setup guide</summary>
        <GoogleSheetsSetupSteps
          status={{
            enabled: connection.enabled,
            lastSyncAt: connection.lastSyncAt,
            lastSyncError: connection.lastSyncError,
            sheetsAuthConfigured,
            serviceAccountEmail,
          }}
        />
      </details>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>

      <label className="leads-settings-field">
        Spreadsheet URL
        <input
          type="url"
          value={spreadsheetUrl}
          onChange={(event) => setSpreadsheetUrl(event.target.value)}
          placeholder={DEFAULT_LEADS_SPREADSHEET_URL}
        />
      </label>

      <label className="leads-settings-field">
        Tab name
        <input
          type="text"
          value={sheetTab}
          onChange={(event) => setSheetTab(event.target.value)}
          placeholder={DEFAULT_LEADS_SHEET_TAB}
        />
      </label>

      <label className="leads-settings-field">
        Header row
        <input
          type="number"
          min={1}
          value={headerRow}
          onChange={(event) => setHeaderRow(event.target.value)}
        />
      </label>

      <p className="leads-machine-muted">
        Google Form columns supported: Timestamp, Full Name, Contact Number, Email
        Address, Company, Requirement Description, Business Owner or Staff.
      </p>

      {connection.lastSyncAt ? (
        <p className="leads-machine-muted">
          Last sync: {new Date(connection.lastSyncAt).toLocaleString("en-IN")}
        </p>
      ) : null}
      {connection.lastSyncError ? (
        <p className="leads-settings-error">{connection.lastSyncError}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-secondary"
          disabled={disabled}
          onClick={() => onTest(formPayload())}
        >
          Test connection
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={disabled}
          onClick={() => onSave(formPayload())}
        >
          Save &amp; sync
        </button>
        <button type="button" className="btn-secondary" disabled={disabled} onClick={onSync}>
          Sync now
        </button>
      </div>
    </article>
  );
}

function ComingSoonConnectionCard({ connection }: { connection: ConnectionRow }) {
  return (
    <article className="leads-settings-card leads-settings-card-coming-soon">
      <div className="leads-settings-card-head">
        <h3>{LEAD_CHANNEL_LABELS[connection.channel]}</h3>
        <span className="leads-coming-soon-badge">Coming soon</span>
      </div>
      <p className="leads-machine-muted">{connection.label}</p>
      <p className="leads-machine-muted">
        This connector is on the roadmap. Google Sheets is available now for Phase 1
        intake.
      </p>
    </article>
  );
}
