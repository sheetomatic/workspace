import { useEffect, useMemo, useState } from "react";
import type {
  AppAction,
  AppConfig,
  AppFormField,
  AppRelated,
  AppView,
  CellValue,
  SheetRow,
  UserRole,
} from "@/lib/app-builder";
import {
  addButtonLabel,
  applyAction,
  applySlice,
  cellStr,
  enrichRow,
  filterRelated,
  initials,
  normKey,
  parentKeyFromRow,
  relatedForView,
  searchRows,
  themeById,
  themeVars,
  tone,
  visibleActions,
  visibleFields,
  visibleNavViews,
} from "@/lib/app-builder";
import {
  isMoneyView,
  rupee,
  summarizeMoney,
  type MoneyRange,
} from "@/lib/app-builder/money-summary";
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
  const [screen, setScreen] = useState<Screen>("home");
  const [toast, setToast] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [row, setRow] = useState<SheetRow | null>(null);
  const [q, setQ] = useState("");
  const [form, setForm] = useState<FormMode | null>(null);
  const [tick, setTick] = useState(0);
  const [pin, setPin] = useState("");
  const [who, setWho] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const signed = (config.users || []).find((u) => u.name === who);
  const role: UserRole | null = signed?.role ?? (who ? "owner" : null);
  const tabs = visibleNavViews(config, role);
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
    let rows = searchRows(applySlice(sheet.listRows(view.tab), view.sliceCols), q).map((r) =>
      enrichRow(r, view.tab, config, sheet),
    );
    const signedUser = (config.users || []).find((u) => u.name === who);
    if (view.ownerCol && signedUser && signedUser.role !== "owner") {
      rows = rows.filter((r) => normKey(cellStr(r, view.ownerCol || "")) === normKey(signedUser.name));
    }
    if (statusFilter && view.statusCol) {
      rows = rows.filter((r) => cellStr(r, view.statusCol || "") === statusFilter);
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, q, tick, sheet, who, statusFilter, config.users]);

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
    setStatusFilter("");
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

  const featured = tabs[0];
  const recent = featured
    ? applySlice(sheet.listRows(featured.tab), featured.sliceCols)
        .slice(0, 3)
        .map((r) => enrichRow(r, featured.tab, config, sheet))
    : [];
  const detailRow = view && row ? enrichRow(row, view.tab, config, sheet) : row;

  const title =
    screen === "home"
      ? config.meta.name
      : screen === "collection"
        ? view?.name || "Collection"
        : screen === "detail"
          ? view && detailRow
            ? cellStr(detailRow, view.titleCol || view.cols[0] || "")
            : "Details"
          : form?.kind === "edit"
            ? "Edit"
            : form?.kind === "related"
              ? form.related.name
              : "New item";

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
              if (!view) return;
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
            role={role}
            recent={recent}
            featured={featured}
            onOpenView={openView}
            onAdd={(v) => {
              setViewId(v.id);
              setForm({ kind: "add", view: v });
              setScreen("form");
            }}
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
            {view.statusCol ? (
              <div className="status-filters">
                <button
                  type="button"
                  className={statusFilter ? "" : "on"}
                  onClick={() => setStatusFilter("")}
                >
                  All
                </button>
                {[
                  ...new Set(
                    applySlice(sheet.listRows(view.tab), view.sliceCols)
                      .map((r) => cellStr(r, view.statusCol || ""))
                      .filter(Boolean),
                  ),
                ].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={statusFilter === status ? "on" : ""}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            ) : null}
            <CollectionList
              view={view}
              rows={deckRows}
              onOpen={openDetail}
            />
          </>
        )}

        {screen === "detail" && view && detailRow && (
          <DetailPane
            view={view}
            row={detailRow}
            hiddenFields={Object.keys(detailRow.cells).filter(
              (key) => !visibleFields(Object.keys(detailRow.cells), config, role, detailRow).includes(key),
            )}
            actions={visibleActions(config, view.id, role, detailRow)}
            onRunAction={(action) => {
              const result = applyAction(action, detailRow, who);
              if (Object.keys(result.cells).length) {
                sheet.updateRow(view.tab, detailRow._row, {
                  ...detailRow.cells,
                  ...result.cells,
                });
                setRow({
                  ...detailRow,
                  cells: { ...detailRow.cells, ...result.cells },
                });
                bump();
              }
              if (result.notify) setToast(result.notify);
              if (result.go === "home") goHome();
              if (result.go === "collection") {
                setRow(null);
                setScreen("collection");
              }
            }}
            relatedBlocks={relatedBlocks}
            onAddRelated={(rel) => {
              if (!row) return;
              setForm({ kind: "related", view, related: rel, parent: row });
              setScreen("form");
            }}
            onOpenRelated={(rel, child) => {
              const childView =
                config.views.find((v) => v.id === rel.childViewId) ||
                config.views.find((v) => v.tab === rel.childTab);
              if (!childView) return;
              setViewId(childView.id);
              openDetail(child);
            }}
            onDelete={
              view.allowDelete === false
                ? undefined
                : () => {
                    sheet.deleteRow(view.tab, detailRow._row);
                    bump();
                    setRow(null);
                    setScreen("collection");
                  }
            }
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
            sheet={sheet}
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
                const qty = Number(stamped.Qty ?? stamped.Quantity);
                const rate = Number(stamped.Rate ?? stamped.Price);
                if (Number.isFinite(qty) && Number.isFinite(rate) && qty && rate) {
                  const amountCol = Object.keys(stamped).find((k) =>
                    /line amount|amount|total/i.test(k),
                  );
                  if (amountCol && (stamped[amountCol] == null || stamped[amountCol] === "")) {
                    stamped[amountCol] = qty * rate;
                  }
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

      {toast ? (
        <p className="rt-toast" role="status">
          {toast}
        </p>
      ) : null}

      {screen !== "form" && (
        <nav className="rt-dock" aria-label="Home">
          <button
            type="button"
            className={screen === "home" ? "on" : ""}
            onClick={goHome}
          >
            <HomeIcon />
            Home
          </button>
        </nav>
      )}
    </div>
  );
}

function HomeScreen({
  config,
  sheet,
  role,
  recent,
  featured,
  onOpenView,
  onAdd,
  onOpenRow,
}: {
  config: AppConfig;
  sheet: SheetAdapter;
  role: UserRole | null;
  recent: SheetRow[];
  featured?: AppView;
  onOpenView: (id: string) => void;
  onAdd: (view: AppView) => void;
  onOpenRow: (view: AppView, row: SheetRow) => void;
}) {
  const tabs = visibleNavViews(config, role);
  const moneyViews = config.views.filter(isMoneyView);
  const [range, setRange] = useState<MoneyRange>("month");
  const summary = summarizeMoney(sheet.getWorkbook(), moneyViews, range);
  return (
    <div className="home">
      <p className="kicker">{config.meta.greeting || "Good morning"}</p>
      <h2>{config.meta.name}</h2>
      {moneyViews.length ? (
        <section className="home-money">
          <div className="home-range" role="tablist" aria-label="Date range">
            {(
              [
                ["month", "This month"],
                ["week", "This week"],
                ["all", "All"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={range === id}
                className={range === id ? "on" : ""}
                onClick={() => setRange(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="home-stats">
            <div>
              <em>Credits</em>
              <strong>{rupee(summary.credits)}</strong>
            </div>
            <div>
              <em>Debits</em>
              <strong>{rupee(summary.debits)}</strong>
            </div>
            <div>
              <em>Net</em>
              <strong>{rupee(summary.net)}</strong>
            </div>
          </div>
          {summary.byCategory.length ? (
            <ul className="home-cats">
              {summary.byCategory.slice(0, 6).map((row) => (
                <li key={`${row.side}-${row.label}`}>
                  <span>
                    {row.side === "in" ? "Credit" : "Expense"} · {row.label}
                  </span>
                  <b>{rupee(row.amount)}</b>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      {moneyViews.length > 1 ? (
        <div className="home-adds">
          {moneyViews.slice(0, 2).map((view) => (
            <button
              key={view.id}
              type="button"
              className="btn primary home-add"
              onClick={() => onAdd(view)}
            >
              {addButtonLabel(view, view.name.startsWith("Credit") ? "New credit" : "New debit")}
            </button>
          ))}
        </div>
      ) : featured?.addFields?.length ? (
        <button type="button" className="btn primary home-add" onClick={() => onAdd(featured)}>
          {addButtonLabel(featured, config.meta.formTitle)}
        </button>
      ) : null}
      {config.meta.showHomeTiles === false ? null : (
        <div className="phone-apps">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className="phone-app"
              onClick={() => onOpenView(t.id)}
            >
              <i className="phone-app-icon" style={{ background: tone(t.name) }}>
                {initials(t.name)}
              </i>
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
        <p className="help">Connect a Sheet or pick a template. Screens come from your tables.</p>
      )}
    </div>
  );
}

function DetailPane({
  view,
  row,
  hiddenFields,
  actions,
  onRunAction,
  relatedBlocks,
  onAddRelated,
  onOpenRelated,
  onDelete,
}: {
  view: AppView;
  row: SheetRow;
  hiddenFields: string[];
  actions: AppAction[];
  onRunAction: (action: AppAction) => void;
  relatedBlocks: {
    rel: AppRelated;
    key: string;
    children: SheetRow[];
  }[];
  onAddRelated: (rel: AppRelated) => void;
  onOpenRelated: (rel: AppRelated, child: SheetRow) => void;
  onDelete?: () => void;
}) {
  const title = cellStr(row, view.titleCol || view.cols[0] || "") || `Item ${row._row}`;
  const status = view.statusCol ? cellStr(row, view.statusCol) : "";
  const sub = view.subtitleCol ? cellStr(row, view.subtitleCol) : "";

  return (
    <div className="detail">
      <div className="hero" style={{ background: tone(title) }}>
        {view.imageCol && cellStr(row, view.imageCol) ? (
          <img className="hero-img" src={cellStr(row, view.imageCol)} alt="" />
        ) : (
          <span>{initials(title)}</span>
        )}
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
        <FieldBlocks
          row={row}
          hide={[view.titleCol || "", ...hiddenFields]}
          imageCol={view.imageCol}
        />
      </section>

      {actions.length ? (
        <section className="block">
          <h3>Actions</h3>
          <div className="actions">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="btn ghost"
                onClick={() => onRunAction(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

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
                <button
                  type="button"
                  className="list-row"
                  key={c._row}
                  onClick={() => onOpenRelated(rel, c)}
                >
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
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
      {onDelete ? (
        <button type="button" className="linkish danger" onClick={onDelete}>
          Delete this item
        </button>
      ) : null}
    </div>
  );
}

function FormPane({
  mode,
  sheet,
  onCancel,
  onSave,
}: {
  mode: FormMode;
  sheet: SheetAdapter;
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
          const dateCol = fields.find((f) => f.type === "date")?.col;
          if (mode.kind === "add" && dateCol && !cells[dateCol]) {
            cells[dateCol] = new Date().toLocaleDateString("en-GB");
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
      {fields.map((f) => {
        const choiceValues = f.choiceTab
          ? [
              ...new Set(
                sheet
                  .listRows(f.choiceTab)
                  .map((r) => cellStr(r, f.choiceCol || ""))
                  .filter(Boolean),
              ),
            ]
          : f.options || [];
        const useChoice = f.type === "choice" || Boolean(f.choiceTab);
        return (
          <label key={f.name}>
            {f.label}
            {f.required ? " *" : ""}
            {useChoice ? (
              <select
                value={values[f.name] ?? ""}
                required={!!f.required}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              >
                <option value="">Select</option>
                {choiceValues.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
                {values[f.name] && !choiceValues.includes(values[f.name]) ? (
                  <option value={values[f.name]}>{values[f.name]}</option>
                ) : null}
              </select>
            ) : (
              <input
                value={values[f.name] ?? ""}
                type={
                  f.type === "number" ? "number" : f.type === "phone" ? "tel" : f.type === "email" ? "email" : "text"
                }
                step={f.type === "number" ? "0.01" : undefined}
                required={!!f.required}
                placeholder={
                  f.type === "date"
                    ? "DD/MM/YYYY"
                    : f.type === "image"
                      ? "https://…/photo.jpg"
                      : f.label
                }
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            )}
          </label>
        );
      })}
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
