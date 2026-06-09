"use client";

import { useActionState } from "react";
import {
  saveGoogleSheetId,
  syncDashboardFromSheetsAction,
  type WorkspaceSettingsState,
} from "@/app/app/settings/actions";
import type { GoogleSheetsConnectionStatus } from "@/lib/integrations/google-sheets-dashboard";

const initialState: WorkspaceSettingsState = { ok: false, message: "" };

export function GoogleSheetsSettingsPanel({
  canEdit,
  initialSheetId,
  connection,
}: {
  canEdit: boolean;
  initialSheetId: string;
  connection: GoogleSheetsConnectionStatus;
}) {
  const [saveState, saveAction, savePending] = useActionState(
    saveGoogleSheetId,
    initialState,
  );
  const [syncState, syncAction, syncPending] = useActionState(
    syncDashboardFromSheetsAction,
    initialState,
  );

  const statusLabel = connection.ready
    ? "Connection ready"
    : connection.authConfigured
      ? "Add spreadsheet ID"
      : "Service account not configured";

  return (
    <div className="saas-sheets-panel">
      <p className="saas-sheets-lead">
        Dashboard KPIs, follow-ups, payments, and approvals read from your
        Google Sheet. Legal case sync uses the tab in your URL (e.g.{" "}
        <code>?gid=1228012786</code>). WhatsApp CRM exports to a separate{" "}
        <strong>WA CRM</strong> tab in the same spreadsheet.
      </p>

      <dl className="saas-settings-list saas-settings-list-meta">
        <div>
          <dt>Connection</dt>
          <dd>
            <span
              className={
                connection.ready
                  ? "saas-pill ok"
                  : connection.authConfigured
                    ? "saas-pill warn"
                    : "saas-pill muted"
              }
            >
              {statusLabel}
            </span>
          </dd>
        </div>
        {connection.spreadsheetUrl ? (
          <div>
            <dt>Spreadsheet</dt>
            <dd>
              <a href={connection.spreadsheetUrl} rel="noreferrer" target="_blank">
                Open in Google Sheets
              </a>
            </dd>
          </div>
        ) : null}
        {connection.authConfigured ? (
          <div>
            <dt>Service account</dt>
            <dd>Configured</dd>
          </div>
        ) : null}
      </dl>

      {canEdit ? (
        <>
          <form action={saveAction} className="saas-settings-form">
            <label>
              Spreadsheet ID or URL
              <input
                defaultValue={initialSheetId}
                name="googleSheetId"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=1228012786"
                type="text"
              />
            </label>
            <button
              className="btn-cta btn-secondary saas-settings-save"
              disabled={savePending}
              type="submit"
            >
              {savePending ? "Saving..." : "Save sheet link"}
            </button>
            {saveState.message ? (
              <p
                className={
                  saveState.ok ? "saas-form-message ok" : "saas-form-message error"
                }
              >
                {saveState.message}
              </p>
            ) : null}
          </form>

          <form action={syncAction} className="saas-settings-form">
            <p className="saas-sheets-hint">
              Optional: copy sheet data into the app database (useful if the API
              is unavailable). The dashboard still reads the sheet when connected.
            </p>
            <button
              className="btn-cta btn-secondary"
              disabled={syncPending || !connection.ready}
              type="submit"
            >
              {syncPending ? "Syncing..." : "Sync to database now"}
            </button>
            {syncState.message ? (
              <p
                className={
                  syncState.ok ? "saas-form-message ok" : "saas-form-message error"
                }
              >
                {syncState.message}
              </p>
            ) : null}
          </form>
        </>
      ) : (
        <p className="saas-sheets-hint">
          Only admins can change the spreadsheet link. Ask your workspace admin to
          share the sheet with the service account email.
        </p>
      )}

      <details className="saas-sheets-schema">
        <summary>Sheet column layout</summary>
        <ul>
          <li>
            <strong>Metrics</strong> (row 1 headers): label, value, tone, minRole,
            actionLabel, actionHref, sortOrder
          </li>
          <li>
            <strong>FollowUps</strong>: clientName, followUpAt, remarks,
            assigneeEmail, minRole
          </li>
          <li>
            <strong>Payments</strong>: clientName, amount, dueAt, minRole
          </li>
          <li>
            <strong>Approvals</strong>: title, department, status, pendingSince,
            minRole
          </li>
        </ul>
        <p>
          Share the spreadsheet with your service account email (Viewer). Use
          dates like <code>today</code>, <code>2026-05-27</code>, or{" "}
          <code>27/05/2026</code>. Roles: VIEWER, STAFF, MANAGER, ADMIN, OWNER.
        </p>
      </details>
    </div>
  );
}
