import { learnPracticeCopyUrl } from "@/lib/learn/practice-workbook";

export function LearnWorkbookBar({
  copyUrl,
}: {
  copyUrl?: string | null;
}) {
  return (
    <aside className="learn-workbook-bar">
      <div>
        <strong>Practice workbook — TOC + hidden session tabs</strong>
        <span>
          Copy the official Sheets file. Open the TOC, then Unhide the practice
          tab named on this lesson. RawData is the sales dump the formulas read.
        </span>
      </div>
      <div className="learn-workbook-actions">
        <a
          className="learn-btn-primary"
          href={copyUrl || learnPracticeCopyUrl()}
          target="_blank"
          rel="noreferrer"
        >
          Copy to Google Sheets
        </a>
        <a className="learn-btn-secondary" href="/api/learn/samples/workbook">
          Download Excel
        </a>
      </div>
    </aside>
  );
}
