import Link from "next/link";
import type { GoogleSheetsSetupStatus } from "@/components/saas/leads-google-sheets-setup";
import { needsGoogleSheetsSetup } from "@/components/saas/leads-google-sheets-setup";

export function LeadsLiveStatusBar({
  status,
  leadsInPeriod,
  canManage,
}: {
  status: GoogleSheetsSetupStatus;
  leadsInPeriod: number;
  canManage: boolean;
}) {
  if (!status.enabled && !status.lastSyncError) {
    return null;
  }

  const isLive =
    status.enabled && Boolean(status.lastSyncAt) && !status.lastSyncError;
  const needsSetup = needsGoogleSheetsSetup(status);

  let tone: "live" | "warning" | "error" = "warning";
  let title = "Google Sheets setup required";
  let detail = "Enable the connector and run your first sync.";

  if (status.lastSyncError) {
    tone = "error";
    title = "Google Sheets sync error";
    detail = status.lastSyncError;
  } else if (isLive) {
    tone = "live";
    title = "Google Sheets live";
    detail = `${leadsInPeriod} lead${leadsInPeriod === 1 ? "" : "s"} in this period · Last sync ${new Date(
      status.lastSyncAt!,
    ).toLocaleString("en-IN")}`;
  } else if (status.enabled && !status.lastSyncAt) {
    tone = "warning";
    title = "Google Sheets enabled — waiting for first sync";
    detail = "Save settings or click Sync now to import leads.";
  }

  return (
    <section className={`leads-live-status is-${tone}`}>
      <div>
        <strong>{title}</strong>
        <p className="leads-machine-muted">{detail}</p>
        {!status.sheetsAuthConfigured ? (
          <p className="leads-machine-muted">
            Service account credentials are not configured on the server. Share the
            sheet with your service account and ensure Google credentials are set in
            production.
          </p>
        ) : null}
      </div>
      {canManage && needsSetup ? (
        <Link className="btn-secondary" href="/app/leads/settings">
          Complete setup
        </Link>
      ) : null}
    </section>
  );
}
