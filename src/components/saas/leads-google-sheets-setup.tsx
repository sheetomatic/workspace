import Link from "next/link";
import { DEFAULT_LEADS_SPREADSHEET_URL } from "@/lib/leads/sheet-config";

export type GoogleSheetsSetupStatus = {
  enabled: boolean;
  lastSyncAt: Date | null;
  lastSyncError: string | null;
  sheetsAuthConfigured: boolean;
  serviceAccountEmail: string | null;
};

export function needsGoogleSheetsSetup(status: GoogleSheetsSetupStatus) {
  return !status.enabled || !status.lastSyncAt || Boolean(status.lastSyncError);
}

export function LeadsGoogleSheetsSetupBanner({
  status,
  canManage,
}: {
  status: GoogleSheetsSetupStatus;
  canManage: boolean;
}) {
  if (!needsGoogleSheetsSetup(status)) {
    return null;
  }

  return (
    <section className="saas-panel leads-sheets-setup-banner">
      <div className="leads-sheets-setup-banner-head">
        <div>
          <h2>Connect Google Sheets</h2>
          <p className="leads-machine-muted">
            Phase 1 intake runs from your Google Form responses sheet. Complete setup
            once, then leads sync on a schedule or when you click Sync now.
          </p>
        </div>
        {canManage ? (
          <Link className="btn-primary" href="/app/leads/settings">
            Open Google Sheets setup
          </Link>
        ) : null}
      </div>

      <GoogleSheetsSetupSteps status={status} compact />
    </section>
  );
}

export function GoogleSheetsSetupSteps({
  status,
  compact = false,
}: {
  status: GoogleSheetsSetupStatus;
  compact?: boolean;
}) {
  const shareEmail =
    status.serviceAccountEmail ??
    "your Sheetomatic service account (ask your admin)";

  const steps = [
    {
      title: "Share your sheet",
      body: (
        <>
          Open your Google Form responses spreadsheet and share it with{" "}
          <code>{shareEmail}</code> as Viewer (or Editor).
        </>
      ),
      done: status.sheetsAuthConfigured,
    },
    {
      title: "Paste spreadsheet URL",
      body: (
        <>
          In setup, paste the sheet URL — for example{" "}
          <a href={DEFAULT_LEADS_SPREADSHEET_URL} target="_blank" rel="noreferrer">
            your intake sheet
          </a>
          .
        </>
      ),
      done: status.enabled,
    },
    {
      title: "Enable and sync",
      body: "Turn on Google Sheets, save, then click Sync now to import leads.",
      done: Boolean(status.lastSyncAt) && !status.lastSyncError,
    },
  ];

  return (
    <ol className={compact ? "leads-sheets-setup-steps is-compact" : "leads-sheets-setup-steps"}>
      {steps.map((step, index) => (
        <li
          key={step.title}
          className={step.done ? "is-done" : index === steps.findIndex((s) => !s.done) ? "is-current" : ""}
        >
          <span className="leads-sheets-setup-step-num">{index + 1}</span>
          <div>
            <strong>{step.title}</strong>
            <p className="leads-machine-muted">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
