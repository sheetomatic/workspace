import type { ReactNode } from "react";
import {
  addButtonLabel,
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

function HomeGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M3 8.2 9 3.5l6 4.7V15a.8.8 0 0 1-.8.8H3.8A.8.8 0 0 1 3 15Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TabGlyph({ name }: { name: string }) {
  if (/staff|part|lead|visit|people|follow/i.test(name)) {
    return (
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="6.2" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M4.2 14.2c.6-2.4 2.3-3.6 4.8-3.6s4.2 1.2 4.8 3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (/item|stock|invent/i.test(name)) {
    return (
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
        <rect x="3.4" y="3.4" width="11.2" height="11.2" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.6 7.4h10.8" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path d="M4 5h10M4 9h10M4 13h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IphoneChrome({
  large,
  children,
}: {
  large?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={large ? "iphone is-large" : "iphone"} aria-hidden>
      <i className="iphone-silent" />
      <i className="iphone-vol iphone-vol-up" />
      <i className="iphone-vol iphone-vol-down" />
      <i className="iphone-power" />
      <div className="iphone-screen">
        <b className="iphone-island" />
        {children}
        <span className="iphone-home" />
      </div>
    </div>
  );
}

export function GlidePhonePreview({
  plan,
  large,
}: {
  plan?: AppPlan;
  large?: boolean;
}) {
  if (!plan) return <div className="iphone is-empty" />;
  const views = navViews(plan.config);
  const featured = views[0] || plan.config.views[0];
  const rows = featured
    ? (plan.workbook.tabs[featured.tab]?.rows ?? []).slice(0, large ? 4 : 3)
    : [];

  return (
    <IphoneChrome large={large}>
      <div className="ios-status">
        <span>9:41</span>
        <span className="ios-status-end">
          <svg viewBox="0 0 18 12" width="15" height="10" aria-hidden>
            <rect x="0.6" y="3.4" width="2.2" height="5.2" rx="0.4" fill="currentColor" />
            <rect x="3.8" y="2.4" width="2.2" height="7.2" rx="0.4" fill="currentColor" />
            <rect x="7" y="1.2" width="2.2" height="8.6" rx="0.4" fill="currentColor" />
            <rect x="10.2" y="0.4" width="2.2" height="10.2" rx="0.4" fill="currentColor" opacity=".35" />
          </svg>
          <svg viewBox="0 0 16 12" width="14" height="10" aria-hidden>
            <path
              d="M1.2 8.6c2.6-2.6 6.8-2.6 9.4 0M3.4 6.6c1.6-1.5 4-1.5 5.6 0M6.2 4.8a.9.9 0 1 1 1.6.8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
          <span className="ios-battery">
            <i />
          </span>
        </span>
      </div>
      <div className="ios-home">
        <p className="ios-kicker">{plan.config.meta.greeting || "Good morning"}</p>
        <div className="ios-title-row">
          <h3 className="ios-title">{plan.config.meta.name}</h3>
          <span className="ios-add" />
        </div>
        {views.length ? (
          <div
            className="ios-tiles"
            style={{
              gridTemplateColumns: `repeat(${Math.min(views.length, 3)}, minmax(0, 1fr))`,
            }}
          >
            {views.slice(0, 3).map((view) => (
              <div className="ios-tile" key={view.id}>
                <strong>{plan.workbook.tabs[view.tab]?.rows.length ?? 0}</strong>
                <span>{view.name}</span>
              </div>
            ))}
          </div>
        ) : null}
        {featured?.addFields?.length ? (
          <div className="ios-cta">{addButtonLabel(featured, plan.config.meta.formTitle)}</div>
        ) : null}
        {featured && rows.length ? (
          <div className="ios-section">
            <div className="ios-section-head">
              <span>Recent {featured.name.toLowerCase()}</span>
              <b>See All</b>
            </div>
            <div className="ios-list">
              {rows.map((row) => {
                const title = rowTitle(featured, row);
                const sub = rowSub(featured, row);
                const status = featured.statusCol ? cellStr(row, featured.statusCol) : "";
                return (
                  <div className="ios-row" key={row._row}>
                    <span className="ios-av" style={{ background: tone(title) }}>
                      {initials(title)}
                    </span>
                    <div>
                      <strong>{title}</strong>
                      {sub ? <small>{sub}</small> : null}
                    </div>
                    {status ? (
                      <span className={chipOk(status) ? "ios-chip ok" : "ios-chip"}>{status}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      <nav
        className="ios-tabbar"
        style={{ gridTemplateColumns: `repeat(${Math.min(views.length, 3) + 1}, 1fr)` }}
      >
        <span className="on">
          <HomeGlyph />
          Home
        </span>
        {views.slice(0, 3).map((view) => (
          <span key={view.id}>
            <TabGlyph name={view.name} />
            {view.name}
          </span>
        ))}
      </nav>
    </IphoneChrome>
  );
}
