import { useEffect, useMemo, useState } from "react";
import type {
  AppConfig,
  AppFormField,
  AppRelated,
  AppView,
  CellValue,
  SheetRow,
} from "@/lib/app-builder";
import {
  applySlice,
  cellStr,
  filterRelated,
  initials,
  navViews,
  parentKeyFromRow,
  relatedForView,
  searchRows,
  themeById,
  themeVars,
  tone,
} from "@/lib/app-builder";
import type { SheetAdapter } from "../sheet/mockAdapter";
import { Avatar, CollectionList, FieldBlocks } from "./Collection";

type Screen = "home" | "collection" | "detail" | "form";

type FormMode =
  | { kind: "add"; view: AppView }
  | { kind: "edit"; view: AppView; row: SheetRow }
  | { kind: "related"; view: AppView; related: AppRelated; parent: SheetRow };

type Props = {
  config: AppConfig;
  sheet: SheetAdapter;
  onSheetChange: () => void;
  focusViewId?: string | null;
};

export function AppRuntime({ config, sheet, onSheetChange, focusViewId }: Props) {
  const tabs = navViews(config);
  const [screen, setScreen] = useState<Screen>("home");
  const [viewId, setViewId] = useState<string | null>(null);
  const [row, setRow] = useState<SheetRow | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormMode | null>(null);
  const [tick, setTick] = useState(0);
  const [pin, setPin] = useState("");
  const [who, setWho] = useState<string | null>(null);

  const view = config.views.find((v) => v.id === viewId) || null;

  useEffect(() => {
    if (!focusViewId) return;
    if (focusViewId === "home") {
      setScreen("home");
      setViewId(null);
      setRow(null);
      setForm(null);
      return;
    }
    openView(focusViewId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusViewId]);

  const deckRows = useMemo(() => {
    if (!view) return [];
    return searchRows(applySlice(sheet.listRows(view.tab), view.sliceCols), q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, q, tick, sheet]);

  const relatedBlocks = useMemo(() => {
    if (!view || !row) return [];
    return relatedForView(config, view.id).map((rel) => {
      const key = parentKeyFromRow(row, rel.parentKeys);
      return {
        rel,
        key,
        children: filterRelated(sheet.listRows(rel.childTab), rel.childKeys, key),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, row, tick, config, sheet]);

  function bump() {
    setTick((t) => t + 1);
    onSheetChange();
  }

  function openView(id: string) {
    setViewId(id);
    setQ("");
    setRow(null);
    setForm(null);
    setScreen("collection");
  }

  function openDetail(r: SheetRow) {
    setRow(r);
    setForm(null);
    setScreen("detail");
  }

  function goHome() {
    setScreen("home");
    setViewId(null);
    setRow(null);
    setForm(null);
  }

  function back() {
    if (screen === "form") {
      setForm(null);
      setScreen(row ? "detail" : "collection");
      return;
    }
    if (screen === "detail") {
      setRow(null);
      setScreen("collection");
      return;
    }
    goHome();
  }

  const title =
    screen === "home"
      ? config.meta.name
      : screen === "collection"
        ? view?.name || "Collection"
        : screen === "detail"
          ? view && row
            ? cellStr(row, view.titleCol || view.cols[0] || "")
            : "Details"
          : form?.kind === "edit"
            ? "Edit"
            : form?.kind === "related"
              ? form.related.name
              : "New item";

  const featured = tabs[0];
  const recent = featured
    ? applySlice(sheet.listRows(featured.tab), featured.sliceCols).slice(0, 3)
    : [];

  const skin = themeVars(themeById(config.meta.themeId), config.meta.themeAccent);

  if (config.meta.requirePin && !who) {
    return (
      <div className="runtime pin-gate" style={skin}>
        <p className="kicker">Staff sign-in</p>
        <h2>Enter PIN</h2>
        <p className="help">No Google account. Owner shares this PIN. Try 1234.</p>
        <input
          className="pin-input"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          inputMode="numeric"
          maxLength={6}
          placeholder="••••"
        />
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            const hit = (config.users || []).find((u) => u.pin === pin.trim());
            if (hit) setWho(hit.name);
            else setPin("");
          }}
        >
          Open app
        </button>
      </div>
    );
  }

  return (
    <div className="runtime" style={skin}>
      <header className="rt-top">
        {screen !== "home" ? (
          <button type="button" className="ghost-btn" onClick={back} aria-label="Back">
            <BackIcon />
          </button>
        ) : config.meta.showBrand === false ? (
          <span className="ghost-btn spacer" />
        ) : (
          <span className="wordmark">{config.meta.brand || "Sheetomatic"}</span>
        )}
        <h1>{title}</h1>
        {screen === "collection" && view?.addFields?.length ? (
          <button
            type="button"
            className="ghost-btn add"
            aria-label="Add"
            onClick={() => {
              setForm({ kind: "add", view });
              setScreen("form");
            }}
          >
            +
          </button>
        ) : screen === "detail" && view?.editFields?.length ? (
          <button
            type="button"
            className="text-link"
            onClick={() => {
              if (!row) return;
              setForm({ kind: "edit", view, row });
              setScreen("form");
            }}
          >
            Edit
          </button>
        ) : (
          <span className="ghost-btn spacer" />
        )}
      </header>

      <div className="rt-body">
        {screen === "home" && (
          <HomeScreen
            config={config}
            sheet={sheet}
            recent={recent}
            featured={featured}
            onOpenView={openView}
            onOpenRow={(v, r) => {
              setViewId(v.id);
              openDetail(r);
            }}
          />
        )}

        {screen === "collection" && view && (
          <>
            {config.meta.showSearch === false ? null : (
              <div className="search">
                <SearchIcon />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search"
                />
              </div>
            )}
            <CollectionList
              view={view}
              rows={deckRows}
              onOpen={openDetail}
            />
          </>
        )}

        {screen === "detail" && view && row && (
          <DetailPane
            view={view}
            row={row}
            relatedBlocks={relatedBlocks}
            onAddRelated={(rel) => {
              setForm({ kind: "related", view, related: rel, parent: row });
              setScreen("form");
            }}
          />
        )}

        {screen === "form" && form && (
          <FormPane
            key={
              form.kind +
              (form.kind === "edit"
                ? String(form.row._row)
                : form.kind === "related"
                  ? form.related.id
                  : form.view.id)
            }
            mode={form}
            onCancel={back}
            onSave={(cells) => {
              if (form.kind === "add") {
                sheet.appendRow(form.view.tab, cells);
              } else if (form.kind === "edit") {
                sheet.updateRow(form.view.tab, form.row._row, cells);
                setRow({
                  ...form.row,
                  cells: { ...form.row.cells, ...cells },
                });
              } else {
                const key = parentKeyFromRow(form.parent, form.related.parentKeys);
                if (!key) throw new Error("Set the parent key first");
                const stamped: Record<string, CellValue> = { ...cells };
                for (const k of form.related.childKeys) stamped[k] = key;
                if (
                  stamped.Qty != null &&
                  stamped.Rate != null &&
                  !stamped["Line Amount"]
                ) {
                  stamped["Line Amount"] = Number(stamped.Qty) * Number(stamped.Rate);
                }
                sheet.appendRow(form.related.childTab, stamped);
              }
              bump();
              setForm(null);
              setScreen(form.kind === "add" ? "collection" : "detail");
            }}
          />
        )}
      </div>

      {screen !== "form" && (
        <nav className="rt-nav" aria-label="Tabs">
          <button
            type="button"
            className={screen === "home" ? "on" : ""}
            onClick={goHome}
          >
            <HomeIcon />
            Home
          </button>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={viewId === t.id && screen !== "home" ? "on" : ""}
              onClick={() => openView(t.id)}
            >
              <TabIcon name={t.name} />
              {t.name}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

function HomeScreen({
  config,
  sheet,
  recent,
  featured,
  onOpenView,
  onOpenRow,
}: {
  config: AppConfig;
  sheet: SheetAdapter;
  recent: SheetRow[];
  featured?: AppView;
  onOpenView: (id: string) => void;
  onOpenRow: (view: AppView, row: SheetRow) => void;
}) {
  const tabs = navViews(config);
  return (
    <div className="home">
      <p className="kicker">{config.meta.greeting || "Good morning"}</p>
      <h2>{config.meta.name}</h2>
      {config.meta.formTitle && config.meta.showFormBanner !== false ? (
        <div className="form-banner">
          <strong>Google Form</strong>
          <span>{config.meta.formTitle} — responses land in this Sheet</span>
        </div>
      ) : null}
      {config.meta.showHomeTiles === false ? null : (
        <div className="tiles">
          {tabs.map((t) => (
            <button key={t.id} type="button" className="tile" onClick={() => onOpenView(t.id)}>
              <em>{sheet.listRows(t.tab).length}</em>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      )}
      {featured && config.meta.showRecent !== false ? (
        <section className="block">
          <div className="block-head">
            <h3>Recent {featured.name.toLowerCase()}</h3>
            <button type="button" className="text-link" onClick={() => onOpenView(featured.id)}>
              See all
            </button>
          </div>
          <CollectionList
            view={{ ...featured, collectionStyle: "list" }}
            rows={recent}
            onOpen={(r) => onOpenRow(featured, r)}
          />
        </section>
      ) : (
        <p className="help">Speak or type what to build. Apply, and this phone fills in.</p>
      )}
    </div>
  );
}

function DetailPane({
  view,
  row,
  relatedBlocks,
  onAddRelated,
}: {
  view: AppView;
  row: SheetRow;
  relatedBlocks: {
    rel: AppRelated;
    key: string;
    children: SheetRow[];
  }[];
  onAddRelated: (rel: AppRelated) => void;
}) {
  const title = cellStr(row, view.titleCol || view.cols[0] || "") || `Item ${row._row}`;
  const status = view.statusCol ? cellStr(row, view.statusCol) : "";
  const sub = view.subtitleCol ? cellStr(row, view.subtitleCol) : "";

  return (
    <div className="detail">
      <div className="hero" style={{ background: tone(title) }}>
        <span>{initials(title)}</span>
      </div>
      <div className="detail-title">
        <h2>{title}</h2>
        {sub ? <p>{sub}</p> : null}
        {status ? <i className={`chip ${status.toLowerCase()}`}>{status}</i> : null}
        {view.phoneCol && cellStr(row, view.phoneCol) ? (
          <div className="actions">
            <a className="btn primary" href={`tel:${cellStr(row, view.phoneCol)}`}>
              Call
            </a>
            <a
              className="btn ghost"
              href={`https://wa.me/91${cellStr(row, view.phoneCol).replace(/\D/g, "").slice(-10)}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          </div>
        ) : null}
      </div>

      <section className="block">
        <h3>Details</h3>
        <FieldBlocks row={row} hide={[view.titleCol || ""]} />
      </section>

      {relatedBlocks.map(({ rel, key, children }) => (
        <section className="block" key={rel.id}>
          <div className="block-head">
            <h3>
              {rel.name}
              <span className="count">{children.length}</span>
            </h3>
            {rel.addFields?.length ? (
              <button type="button" className="text-link" onClick={() => onAddRelated(rel)}>
                Add
              </button>
            ) : null}
          </div>
          {!key ? (
            <p className="help">Related items appear once this record has a key.</p>
          ) : !children.length ? (
            <p className="help">No related items yet.</p>
          ) : (
            <div className="list compact">
              {children.map((c) => (
                <div className="list-row static" key={c._row}>
                  <Avatar name={cellStr(c, rel.cols[0] || "")} />
                  <div className="list-copy">
                    <strong>{cellStr(c, rel.cols[0] || "") || `Row ${c._row}`}</strong>
                    <span>
                      {rel.cols
                        .slice(1, 4)
                        .map((col) => cellStr(c, col))
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function FormPane({
  mode,
  onCancel,
  onSave,
}: {
  mode: FormMode;
  onCancel: () => void;
  onSave: (cells: Record<string, CellValue>) => void;
}) {
  const fields: AppFormField[] =
    mode.kind === "add"
      ? mode.view.addFields || []
      : mode.kind === "edit"
        ? mode.view.editFields || []
        : mode.related.addFields || [];

  const initial: Record<string, string> = {};
  if (mode.kind === "edit") {
    for (const f of fields) initial[f.name] = cellStr(mode.row, f.col);
  }

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [err, setErr] = useState("");

  return (
    <form
      className="form-view"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          setErr("");
          const cells: Record<string, CellValue> = {};
          for (const f of fields) {
            const raw = values[f.name] ?? "";
            if (f.required && !String(raw).trim()) {
              throw new Error(`${f.label} is required`);
            }
            cells[f.col] = f.type === "number" ? (raw === "" ? "" : Number(raw)) : raw;
          }
          if (mode.kind === "add" && mode.view.statusCol && !cells[mode.view.statusCol]) {
            cells[mode.view.statusCol] = "Open";
          }
          if (mode.kind === "add" && mode.view.tab === "Orders" && !cells.Date) {
            cells.Date = new Date().toLocaleDateString("en-GB");
          }
          onSave(cells);
        } catch (ex) {
          setErr(ex instanceof Error ? ex.message : String(ex));
        }
      }}
    >
      {mode.kind === "related" ? (
        <p className="help">
          Linked to{" "}
          <strong>{parentKeyFromRow(mode.parent, mode.related.parentKeys) || "—"}</strong>
        </p>
      ) : null}
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          {f.required ? " *" : ""}
          <input
            value={values[f.name] ?? ""}
            type={f.type === "number" ? "number" : f.type === "date" ? "text" : "text"}
            step={f.type === "number" ? "0.01" : undefined}
            required={!!f.required}
            placeholder={f.label}
            onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
          />
        </label>
      ))}
      {err ? <p className="err">{err}</p> : null}
      <div className="form-actions">
        <button type="submit" className="btn primary">
          Submit
        </button>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <circle cx="7" cy="7" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.4 10.4 13 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M3 8.2 9 3.5l6 4.7V15a.8.8 0 0 1-.8.8H3.8A.8.8 0 0 1 3 15Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TabIcon({ name }: { name: string }) {
  if (name === "Parties") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="6.2" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4.2 14.2c.6-2.4 2.3-3.6 4.8-3.6s4.2 1.2 4.8 3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "Items") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <rect x="3.4" y="3.4" width="11.2" height="11.2" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3.6 7.4h10.8" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M4 5h10v9.2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M6.5 5V4.2A1.7 1.7 0 0 1 8.2 2.5h1.6A1.7 1.7 0 0 1 11.5 4.2V5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
