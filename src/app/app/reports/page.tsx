import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { FmsReportsMisPanel } from "@/components/saas/fms-reports-mis-panel";
import { requireSession } from "@/lib/require-session";
import { getFmsMisSummary } from "@/lib/fms/queries";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { listWorkspaceLinks, WORKSPACE_LINK_LABELS } from "@/lib/workspace";
import { getGoogleSheetsConnectionStatus } from "@/lib/integrations/google-sheets-dashboard";
import { getSpreadsheetIdForOrganization } from "@/lib/integrations/google-sheets-dashboard";

function lookerEmbedUrl(url: string) {
  if (url.includes("/embed/")) {
    return url;
  }
  if (url.includes("lookerstudio.google.com/reporting/")) {
    return url.replace("/reporting/", "/embed/reporting/");
  }
  return url;
}

export default async function ReportsPage() {
  const user = await requireSession("VIEWER", { module: "REPORTS" });
  const links = await listWorkspaceLinks(user.organizationId);
  const reportLinks = links.filter(
    (link) =>
      link.type === "LOOKER_STUDIO" ||
      link.type === "GOOGLE_SHEET" ||
      link.type === "APPSHEET",
  );

  const spreadsheetId = await getSpreadsheetIdForOrganization(user.organizationId);
  const sheetsStatus = getGoogleSheetsConnectionStatus(spreadsheetId);
  const fmsEnabled = hasWorkspaceModule(user, "FMS");
  const fmsMis = fmsEnabled ? await getFmsMisSummary(user.organizationId) : null;

  return (
    <div className="saas-page">
      <PageHeader
        title="Reports"
        description="MIS dashboards and sheet sources connected to your workspace."
      />

      {fmsMis ? <FmsReportsMisPanel summary={fmsMis} /> : null}

      {sheetsStatus.ready ? (
        <article className="saas-panel saas-reports-panel">
          <h3>Google Sheets source</h3>
          <p className="saas-panel-lead">
            Dashboard metrics load from your Google Sheet in real time.
          </p>
          <a
            className="btn-cta btn-secondary"
            href={sheetsStatus.spreadsheetUrl ?? "/app/settings"}
            rel="noreferrer"
            target="_blank"
          >
            Open Google Sheet
          </a>
        </article>
      ) : (
        <article className="saas-panel">
          <h3>Connect Google Sheets</h3>
          <p className="saas-panel-lead">
            Add service account credentials and a spreadsheet ID in Settings to
            power MIS on the dashboard.
          </p>
          <Link className="btn-cta btn-primary" href="/app/settings">
            Go to Settings
          </Link>
        </article>
      )}

      {reportLinks.length === 0 ? (
        <div className="ws-empty-state">
          <p>No report links yet. Admins can add Looker Studio links in Settings.</p>
        </div>
      ) : (
        reportLinks.map((link) => (
          <article className="saas-panel saas-reports-panel" key={link.id}>
            <p className="saas-report-kicker">
              {WORKSPACE_LINK_LABELS[link.type]}
            </p>
            <h3>{link.label}</h3>
            {link.type === "LOOKER_STUDIO" ? (
              <iframe
                className="saas-looker-embed"
                src={lookerEmbedUrl(link.url)}
                title={link.label}
                loading="lazy"
                allowFullScreen
              />
            ) : (
              <a
                className="btn-cta btn-secondary"
                href={link.url}
                rel="noreferrer"
                target="_blank"
              >
                Open {WORKSPACE_LINK_LABELS[link.type]}
              </a>
            )}
          </article>
        ))
      )}
    </div>
  );
}
