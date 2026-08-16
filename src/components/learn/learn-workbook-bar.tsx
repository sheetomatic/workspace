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
          1,000+ sales lines from a Raipur electrical shop. Click Copy to Google
          Sheets, then File → Make a copy. Or download Excel. Apply each topic
          on the same file — lookups, dashboard, ageing, GST.
        </span>
      </div>
      <div className="learn-workbook-actions">
        {copyUrl ? (
          <a className="learn-btn-primary" href={copyUrl} target="_blank" rel="noreferrer">
            Copy to Google Sheets
          </a>
        ) : null}
        <a
          className={copyUrl ? "learn-btn-secondary" : "learn-btn-primary"}
          href="/api/learn/samples/workbook"
        >
          Download Excel
        </a>
      </div>
    </aside>
  );
}
