import Link from "next/link";
import type { GoogleSheetsSetupStatus } from "@/components/saas/leads-google-sheets-setup";
import { needsGoogleSheetsSetup } from "@/components/saas/leads-google-sheets-setup";

export function LeadsConnectionAlert({
  status,
  leadsCount,
  canManage,
}: {
  status: GoogleSheetsSetupStatus;
  leadsCount: number;
  canManage: boolean;
}) {
  const isLive =
    status.enabled && Boolean(status.lastSyncAt) && !status.lastSyncError;

  if (isLive) {
    return null;
  }

  if (status.lastSyncError) {
    return (
      <div className="leads-connection-alert is-error" role="alert">
        <div>
          <strong>Google Sheets sync failed</strong>
          <p>{status.lastSyncError}</p>
        </div>
        {canManage ? (
          <Link className="btn-secondary btn-sm" href="/app/leads/settings">
            Fix in settings
          </Link>
        ) : null}
      </div>
    );
  }

  if (leadsCount > 0 && status.enabled && !status.lastSyncAt) {
    return (
      <div className="leads-connection-alert is-warning" role="status">
        <div>
          <strong>{leadsCount} leads in this workspace</strong>
          <p>Run Sync now in settings to refresh from Google Sheets and confirm the live connection.</p>
        </div>
        {canManage ? (
          <Link className="btn-primary btn-sm" href="/app/leads/settings">
            Sync now
          </Link>
        ) : null}
      </div>
    );
  }

  if (!needsGoogleSheetsSetup(status) || leadsCount > 0) {
    return null;
  }

  return (
    <div className="leads-connection-alert is-setup" role="status">
      <div>
        <strong>Connect your Google Form sheet</strong>
        <p>
          Share the responses spreadsheet with{" "}
          <code>{status.serviceAccountEmail ?? "your Sheetomatic service account"}</code>, then
          complete setup once. Leads sync daily or on demand.
        </p>
      </div>
      {canManage ? (
        <Link className="btn-primary btn-sm" href="/app/leads/settings">
          Open setup
        </Link>
      ) : null}
    </div>
  );
}
