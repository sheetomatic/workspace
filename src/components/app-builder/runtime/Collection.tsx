import type { AppView, SheetRow } from "@/lib/app-builder";
import { cellStr, initials, isImageUrl, tone } from "@/lib/app-builder";

export function CellVisual({ value, asImage }: { value: string; asImage?: boolean }) {
  if ((asImage || isImageUrl(value)) && /^https?:\/\//i.test(value)) {
    return <img className="cell-img" src={value} alt="" />;
  }
  return <>{value}</>;
}

function titleOf(view: AppView, row: SheetRow) {
  return cellStr(row, view.titleCol || view.cols[0] || "") || `Item ${row._row}`;
}

function subtitleOf(view: AppView, row: SheetRow) {
  if (view.subtitleCol) return cellStr(row, view.subtitleCol);
  const extra = view.cols.find((c) => c !== view.titleCol && c !== view.statusCol);
  return extra ? cellStr(row, extra) : "";
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" style={{ background: tone(name || "·") }} aria-hidden>
      {initials(name || "·")}
    </span>
  );
}

export function CollectionList({
  view,
  rows,
  onOpen,
}: {
  view: AppView;
  rows: SheetRow[];
  onOpen: (row: SheetRow) => void;
}) {
  if (!rows.length) {
    return (
      <div className="empty">
        <strong>Nothing here yet</strong>
        <p>Add an item to grow this collection.</p>
      </div>
    );
  }

  if (view.collectionStyle === "table") {
    const cols = view.cols.length ? view.cols : Object.keys(rows[0]?.cells ?? {});
    return (
      <div className="table-wrap">
        <table className="rt-table">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._row} onClick={() => onOpen(r)}>
                {cols.map((c) => (
                  <td key={c}>
                    <CellVisual value={cellStr(r, c)} asImage={c === view.imageCol} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (view.collectionStyle === "kanban") {
    const col = view.statusCol || "Status";
    const buckets = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = cellStr(r, col) || "Open";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(r);
    }
    return (
      <div className="kanban">
        {[...buckets.entries()].map(([lane, list]) => (
          <div className="lane" key={lane}>
            <h4>
              {lane} <em>{list.length}</em>
            </h4>
            {list.map((r) => {
              const title = titleOf(view, r);
              return (
                <button key={r._row} type="button" className="lane-card" onClick={() => onOpen(r)}>
                  <strong>{title}</strong>
                  <span>{subtitleOf(view, r)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  if (view.collectionStyle === "calendar") {
    const col = view.cols.find((c) => /date|due|when/i.test(c)) || view.cols[1] || "Date";
    const buckets = new Map<string, typeof rows>();
    for (const r of rows) {
      const key = cellStr(r, col) || "No date";
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(r);
    }
    return (
      <div className="kanban">
        {[...buckets.entries()].map(([day, list]) => (
          <div className="lane" key={day}>
            <h4>
              {day} <em>{list.length}</em>
            </h4>
            {list.map((r) => (
              <button key={r._row} type="button" className="lane-card" onClick={() => onOpen(r)}>
                <strong>{titleOf(view, r)}</strong>
                <span>{subtitleOf(view, r)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (view.collectionStyle === "chart") {
    const col = view.statusCol || view.cols.find((c) => /stage|status/i.test(c)) || view.cols[0];
    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = cellStr(r, col) || "Blank";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const max = Math.max(1, ...counts.values());
    return (
      <div className="ab-chart">
        {[...counts.entries()].map(([label, count]) => (
          <button key={label} type="button" className="ab-chart-row" onClick={() => onOpen(rows[0])}>
            <span>{label}</span>
            <i style={{ width: `${Math.round((count / max) * 100)}%` }} />
            <em>{count}</em>
          </button>
        ))}
      </div>
    );
  }

  if (view.collectionStyle === "cards") {
    return (
      <div className="cards">
        {rows.map((r) => {
          const title = titleOf(view, r);
          const sub = subtitleOf(view, r);
          const status = view.statusCol ? cellStr(r, view.statusCol) : "";
          const meta = view.cols
            .filter((c) => c !== view.titleCol && c !== view.subtitleCol && c !== view.statusCol)
            .slice(0, 2)
            .map((c) => cellStr(r, c))
            .filter(Boolean);
          return (
            <button key={r._row} type="button" className="card" onClick={() => onOpen(r)}>
              <div className="card-art" style={{ background: tone(title) }}>
                {view.imageCol && cellStr(r, view.imageCol) ? (
                  <CellVisual value={cellStr(r, view.imageCol)} asImage />
                ) : (
                  <span>{initials(title)}</span>
                )}
              </div>
              <div className="card-body">
                <strong>{title}</strong>
                {sub ? <span>{sub}</span> : null}
                {meta.length ? <em>{meta.join(" · ")}</em> : null}
                {status ? <i className={`chip ${status.toLowerCase()}`}>{status}</i> : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="list">
      {rows.map((r) => {
        const title = titleOf(view, r);
        const sub = subtitleOf(view, r);
        const status = view.statusCol ? cellStr(r, view.statusCol) : "";
        const extra = view.cols
          .filter((c) => c !== view.titleCol && c !== view.subtitleCol && c !== view.statusCol)
          .map((c) => cellStr(r, c))
          .filter(Boolean)
          .slice(0, 1)[0];
        return (
          <button key={r._row} type="button" className="list-row" onClick={() => onOpen(r)}>
            {view.imageCol && cellStr(r, view.imageCol) ? (
              <span className="thumb">
                <CellVisual value={cellStr(r, view.imageCol)} asImage />
              </span>
            ) : (
              <Avatar name={title} />
            )}
            <div className="list-copy">
              <strong>{title}</strong>
              <span>
                {[sub, extra].filter(Boolean).join(" · ")}
              </span>
            </div>
            {status ? <i className={`chip ${status.toLowerCase()}`}>{status}</i> : null}
            <Chevron />
          </button>
        );
      })}
    </div>
  );
}

export function FieldBlocks({
  row,
  hide,
  imageCol,
}: {
  row: SheetRow;
  hide?: string[];
  imageCol?: string;
}) {
  const skip = new Set(hide ?? []);
  const keys = Object.keys(row.cells).filter(
    (k) => cellStr(row, k) !== "" && !skip.has(k),
  );
  if (!keys.length) return <p className="help">No values on this item.</p>;
  return (
    <div className="fields">
      {keys.map((k) => (
        <div className="field" key={k}>
          <dt>{k}</dt>
          <dd>
            <CellVisual value={cellStr(row, k)} asImage={k === imageCol} />
          </dd>
        </div>
      ))}
    </div>
  );
}

export function Chevron() {
  return (
    <svg className="chev" width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path
        d="M6 3.5 10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
