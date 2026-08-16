import { MSME_FIRM } from "@/lib/learn/msme-workbook";

export function LearnWorkbookBar({
  copyUrl,
}: {
  copyUrl?: string | null;
}) {
  return (
    <aside className="learn-workbook-bar">
      <div>
        <strong>Practice workbook — {MSME_FIRM.name}</strong>
        <span>
          1,000+ sales lines from a Raipur electrical shop. Upload this Excel to
          Google Drive → Open with Google Sheets. That is your copy. Then apply
          each topic on the same file — lookups, dashboard, ageing, GST.
        </span>
      </div>
      <div className="learn-workbook-actions">
        {copyUrl ? (
          <a className="learn-btn-primary" href={copyUrl} target="_blank" rel="noreferrer">
            Copy to Google Sheets
          </a>
        ) : null}
        <a className="learn-btn-primary" href="/api/learn/samples/workbook">
          Download Excel — open in Google Sheets
        </a>
      </div>
    </aside>
  );
}
