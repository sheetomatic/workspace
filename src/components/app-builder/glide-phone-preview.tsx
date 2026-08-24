import {
  cellStr,
  initials,
  navViews,
  tone,
  type AppPlan,
  type AppView,
  type SheetRow,
} from "@/lib/app-builder";
import "./glide-phone-preview.css";

function prettyCell(value: string) {
  if (/^\d+(\.\d+)?$/.test(value) && Number(value) >= 100) {
    return `₹${Number(value).toLocaleString("en-IN")}`;
  }
  return value;
}

function rowTitle(view: AppView, row: SheetRow) {
  return cellStr(row, view.titleCol || view.cols[0] || "") || `Item ${row._row}`;
}

function rowSub(view: AppView, row: SheetRow) {
  const bits: string[] = [];
  if (view.subtitleCol) bits.push(cellStr(row, view.subtitleCol));
  const money = view.cols.find(
    (col) =>
      /amount|value|stock|qty/i.test(col) &&
      col !== view.titleCol &&
      col !== view.subtitleCol,
  );
  if (money) bits.push(prettyCell(cellStr(row, money)));
  return bits.filter(Boolean).join(" · ");
}

function chipOk(status: string) {
  return /dispatch|paid|won|done|present|out|ok/i.test(status);
}

export function GlidePhonePreview({
  plan,
  large,
}: {
  plan?: AppPlan;
  large?: boolean;
}) {
  if (!plan) return <div className="store-device" />;
  const views = navViews(plan.config);
  const featured = views[0] || plan.config.views[0];
  if (!featured) {
    return (
      <div className={large ? "store-device is-large glide-phone" : "store-device glide-phone"}>
        <div className="glide-phone-screen">
          <h3>{plan.config.meta.name}</h3>
        </div>
      </div>
    );
  }
  const rows = (plan.workbook.tabs[featured.tab]?.rows ?? []).slice(0, large ? 4 : 3);
  return (
    <div
      className={large ? "store-device is-large glide-phone" : "store-device glide-phone"}
      aria-hidden
    >
      <div className="glide-phone-screen">
        <div className="glide-phone-bar">
          <span>9:41</span>
          <strong>Sheetomatic</strong>
          <span>LTE</span>
        </div>
        <p className="glide-phone-kicker">{plan.config.meta.greeting || "Good morning"}</p>
        <h3>{plan.config.meta.name}</h3>
        {views.length ? (
          <div className={`glide-phone-tiles count-${Math.min(views.length, 3)}`}>
            {views.slice(0, 3).map((view) => (
              <span key={view.id}>
                <em>{plan.workbook.tabs[view.tab]?.rows.length ?? 0}</em>
                <i>{view.name}</i>
              </span>
            ))}
          </div>
        ) : null}
        <div className="glide-phone-list">
          {rows.map((row) => {
            const title = rowTitle(featured, row);
            const sub = rowSub(featured, row);
            const status = featured.statusCol ? cellStr(row, featured.statusCol) : "";
            return (
              <div className="glide-phone-row" key={row._row}>
                <span className="glide-phone-av" style={{ background: tone(title) }}>
                  {initials(title)}
                </span>
                <div>
                  <strong>{title}</strong>
                  {sub ? <small>{sub}</small> : null}
                </div>
                {status ? (
                  <span className={chipOk(status) ? "glide-phone-chip ok" : "glide-phone-chip"}>
                    {status}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        <div
          className="glide-phone-nav"
          style={{ gridTemplateColumns: `repeat(${Math.min(views.length, 3) + 1}, 1fr)` }}
        >
          <em>Home</em>
          {views.slice(0, 3).map((view) => (
            <span key={view.id}>{view.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
