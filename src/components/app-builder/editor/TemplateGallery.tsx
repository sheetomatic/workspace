import { TEMPLATES, type AppPlan } from "@/lib/app-builder";

type Props = {
  onPick: (plan: AppPlan) => void;
  onBack?: () => void;
};

export function TemplateGallery({ onPick, onBack }: Props) {
  return (
    <div className="tpl-gallery">
      {onBack ? (
        <button type="button" className="tpl-back" onClick={onBack}>
          ← Back
        </button>
      ) : null}
      <header className="tpl-head">
        <h2>Start from a ready app</h2>
        <p>See the tables first. We can create that Sheet in your Google Drive, then you tweak the phone.</p>
      </header>
      <div className="tpl-grid">
        {TEMPLATES.map((plan) => {
          const tab = Object.values(plan.workbook.tabs)[0];
          return (
            <button
              key={plan.id}
              type="button"
              className="tpl-card"
              onClick={() => onPick(plan)}
            >
              <strong>{plan.label}</strong>
              <span>{plan.blurb}</span>
              {tab ? (
                <div className="tpl-preview" aria-hidden>
                  <div className="tpl-preview-head">
                    {tab.headers.slice(0, 4).map((h) => (
                      <em key={h}>{h}</em>
                    ))}
                  </div>
                  {(tab.rows[0] ? [tab.rows[0]] : []).map((row) => (
                    <div key={row._row} className="tpl-preview-row">
                      {tab.headers.slice(0, 4).map((h) => (
                        <i key={h}>{String(row.cells[h] ?? "")}</i>
                      ))}
                    </div>
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
