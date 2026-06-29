"use client";

import { useState, useTransition } from "react";
import type { LeadSourceChannel } from "@prisma/client";
import Link from "next/link";
import { regenerateLeadsApiKey, syncLeadChannelNow, updateGoogleSheetsLeadConfig } from "@/app/app/leads/actions";
import {
  isLeadSourceComingSoon,
  LEAD_CHANNEL_LABELS,
  LEAD_SOURCE_PRIORITY_CHANNEL,
} from "@/lib/leads/channels";
import { DEFAULT_LEADS_SPREADSHEET_URL } from "@/lib/leads/sheet-config";
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

export function LeadsSettingsPanel({
  connections,
  apiKeyHint,
  ingestUrl,
  sheetsAuthConfigured,
}: {
  connections: ConnectionRow[];
  apiKeyHint: string | null;
  ingestUrl: string;
  sheetsAuthConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [freshKey, setFreshKey] = useState<string | null>(null);

  return (
    <div className="saas-page leads-settings-page">
      <header className="saas-page-head">
        <div>
          <h1>Leads Machine settings</h1>
          <p>
            Phase 1: Google Sheets is the active intake connector. WhatsApp, Instagram,
            Facebook, and manual entry are coming soon.
          </p>
        </div>
        <Link className="btn-secondary" href="/app/leads">
          Back to leads
        </Link>
      </header>

      <section className="saas-panel">
        <h2>Ingest API</h2>
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
      </section>

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
                onSave={(payload) =>
                  startTransition(async () => {
                    await updateGoogleSheetsLeadConfig(payload);
                  })
                }
                onSync={() =>
                  startTransition(async () => {
                    await syncLeadChannelNow(connection.channel);
                  })
                }
              />
            ) : isLeadSourceComingSoon(connection.channel) ? (
              <ComingSoonConnectionCard key={connection.id} connection={connection} />
            ) : null,
          )}
      </div>
    </div>
  );
}

function GoogleSheetsConnectionCard({
  connection,
  disabled,
  sheetsAuthConfigured,
  onSave,
  onSync,
}: {
  connection: ConnectionRow;
  disabled: boolean;
  sheetsAuthConfigured: boolean;
  onSave: (payload: {
    enabled: boolean;
    spreadsheetUrl: string;
    sheetTab: string;
    headerRow: number;
  }) => void;
  onSync: () => void;
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
    typeof config.sheetTab === "string" ? config.sheetTab : "",
  );
  const [headerRow, setHeaderRow] = useState(
    typeof config.headerRow === "number" ? String(config.headerRow) : "1",
  );

  return (
    <article className="leads-settings-card leads-settings-card-priority">
      <div className="leads-settings-card-head">
        <h3>{LEAD_CHANNEL_LABELS.GOOGLE_SHEETS}</h3>
        <span className="leads-priority-badge">Active · Phase 1</span>
      </div>
      <p className="leads-machine-muted">{connection.label}</p>
      <p className="leads-machine-muted">
        Service account: {sheetsAuthConfigured ? "configured" : "not configured — CSV export fallback"}
      </p>

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
        Tab name (optional)
        <input
          type="text"
          value={sheetTab}
          onChange={(event) => setSheetTab(event.target.value)}
          placeholder="First tab if empty"
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
        Expected columns include Date, Name, Phone, Email, City, Requirement, Source, Status.
      </p>

      {connection.lastSyncAt ? (
        <p className="leads-machine-muted">
          Last sync: {new Date(connection.lastSyncAt).toLocaleString("en-IN")}
        </p>
      ) : null}
      {connection.lastSyncError ? (
        <p className="leads-machine-muted" style={{ color: "#b91c1c" }}>
          {connection.lastSyncError}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={disabled}
          onClick={() =>
            onSave({
              enabled,
              spreadsheetUrl,
              sheetTab,
              headerRow: Number.parseInt(headerRow, 10) || 1,
            })
          }
        >
          Save
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
