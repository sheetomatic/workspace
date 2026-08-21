import { useState } from "react";
import {
  styleLabel,
  type AppConfig,
  type AppFormField,
  type AppView,
  type CollectionStyle,
} from "@/lib/app-builder";
import type { SheetAdapter } from "../sheet/mockAdapter";
import { ThemePicker } from "./ThemePicker";

type Props = {
  config: AppConfig;
  sheet: SheetAdapter;
  focus: string;
  onFocus: (id: string) => void;
  onChange: (next: AppConfig) => void;
};

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `screen-${Date.now()}`;
}

function fieldFromCol(col: string): AppFormField {
  return {
    name: col.toLowerCase().replace(/\s+/g, ""),
    label: col,
    col,
    type: /qty|rate|amount|stock|price|count/i.test(col) ? "number" : "text",
  };
}

function patchView(config: AppConfig, id: string, patch: Partial<AppView>): AppConfig {
  return {
    ...config,
    views: config.views.map((v) => (v.id === id ? { ...v, ...patch } : v)),
  };
}

export function DesignPanel({ config, sheet, focus, onFocus, onChange }: Props) {
  const selected = config.views.find((v) => v.id === focus) || null;
  const book = sheet.getWorkbook();
  const tables = Object.keys(book.tabs);

  if (focus === "home") {
    return <HomeDesign config={config} onChange={onChange} />;
  }
  if (!selected) {
    return <p className="hint">Pick a screen.</p>;
  }
  return (
    <ScreenDesign
      config={config}
      sheet={sheet}
      view={selected}
      tables={tables}
      headers={book.tabs[selected.tab]?.headers || selected.cols}
      unusedTables={tables.filter((t) => !config.views.some((v) => v.tab === t))}
      onChange={onChange}
      onFocus={onFocus}
    />
  );
}

function HomeDesign({
  config,
  onChange,
}: {
  config: AppConfig;
  onChange: (c: AppConfig) => void;
}) {
  const m = config.meta;
  function meta(patch: Partial<typeof m>) {
    onChange({ ...config, meta: { ...m, ...patch } });
  }
  return (
    <>
      <ThemePicker meta={m} onChange={meta} />
      <h3>Header</h3>
      <label className="field-label">
        Brand (left of title)
        <input
          value={m.brand ?? "Sheetomatic"}
          onChange={(e) => meta({ brand: e.target.value })}
        />
      </label>
      <label className="field-label">
        App title
        <input
          value={m.name}
          onChange={(e) => meta({ name: e.target.value })}
        />
      </label>
      <label className="field-label">
        Greeting
        <input
          value={m.greeting ?? "Good morning"}
          onChange={(e) => meta({ greeting: e.target.value })}
        />
      </label>
      <label className="field-label">
        Form title
        <input
          value={m.formTitle ?? ""}
          onChange={(e) => meta({ formTitle: e.target.value })}
          placeholder="New order"
        />
      </label>
      <p className="aside-label">Show / hide</p>
      <Toggle
        label="Brand in header"
        on={m.showBrand !== false}
        onChange={(v) => meta({ showBrand: v })}
      />
      <Toggle
        label="Form banner"
        on={m.showFormBanner !== false}
        onChange={(v) => meta({ showFormBanner: v })}
      />
      <Toggle
        label="Home tiles"
        on={m.showHomeTiles !== false}
        onChange={(v) => meta({ showHomeTiles: v })}
      />
      <Toggle
        label="Recent list"
        on={m.showRecent !== false}
        onChange={(v) => meta({ showRecent: v })}
      />
      <Toggle
        label="Search on lists"
        on={m.showSearch !== false}
        onChange={(v) => meta({ showSearch: v })}
      />
    </>
  );
}

function ScreenDesign({
  config,
  sheet,
  view,
  tables,
  headers,
  unusedTables,
  onChange,
  onFocus,
}: {
  config: AppConfig;
  sheet: SheetAdapter;
  view: AppView;
  tables: string[];
  headers: string[];
  unusedTables: string[];
  onChange: (c: AppConfig) => void;
  onFocus: (id: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [pickTab, setPickTab] = useState(unusedTables[0] || tables[0] || "");

  function set(patch: Partial<AppView>) {
    onChange(patchView(config, view.id, patch));
  }

  function addScreen() {
    const tab = (pickTab || newName).trim();
    if (!tab) return;
    if (!tables.includes(tab)) return;
    const heads = sheet.getTab(tab)?.headers.length
      ? sheet.getTab(tab)!.headers
      : ["Name"];
    const id = slug(tab) + "-" + Date.now().toString().slice(-4);
    const next: AppView = {
      id,
      hub: view.hub || "App",
      name: tab,
      kind: "deck",
      tab,
      titleCol: heads[0],
      subtitleCol: heads[1],
      cols: heads,
      collectionStyle: "list",
      addFields: heads.map(fieldFromCol),
    };
    onChange({ ...config, views: [...config.views, next] });
    onFocus(id);
    setNewName("");
  }

  function addBlank() {
    const name = newName.trim();
    if (!name) return;
    const id = slug(name);
    if (config.views.some((v) => v.id === id)) return;
    const next: AppView = {
      id,
      hub: "App",
      name,
      kind: "deck",
      tab: name,
      titleCol: "Name",
      cols: ["Name"],
      collectionStyle: "list",
      addFields: [fieldFromCol("Name")],
    };
    sheet.addTab(name);
    onChange({ ...config, views: [...config.views, next] });
    onFocus(id);
    setNewName("");
  }

  function removeScreen() {
    onChange({
      ...config,
      views: config.views.filter((v) => v.id !== view.id),
      related: config.related.filter((r) => r.parentViewId !== view.id),
    });
    onFocus("home");
  }

  const shown = view.cols;
  const hidden = headers.filter((h) => !shown.includes(h));

  return (
    <>
      <h3>Screen</h3>
      <label className="field-label">
        Header title
        <input value={view.name} onChange={(e) => set({ name: e.target.value })} />
      </label>
      <label className="field-label">
        Sheet tab
        <select
          value={view.tab}
          onChange={(e) => {
            const tab = e.target.value;
            const heads = sheet.getTab(tab)?.headers || [];
            set({
              tab,
              titleCol: heads[0] || view.titleCol,
              cols: heads.length ? heads : view.cols,
            });
          }}
        >
          {tables.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {!tables.includes(view.tab) ? <option value={view.tab}>{view.tab}</option> : null}
        </select>
      </label>

      <p className="hint">How this collection looks</p>
      <div className="style-picks">
        {(["list", "cards", "table", "kanban"] as CollectionStyle[]).map((s) => (
          <button
            key={s}
            type="button"
            className={view.collectionStyle === s ? "on" : ""}
            onClick={() => set({ collectionStyle: s })}
          >
            {styleLabel(s)}
          </button>
        ))}
      </div>

      <Toggle
        label="Show in bottom tabs"
        on={view.nav !== false}
        onChange={(v) => set({ nav: v })}
      />

      <label className="field-label">
        Title column
        <select
          value={view.titleCol || ""}
          onChange={(e) => set({ titleCol: e.target.value })}
        >
          {headers.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Subtitle
        <select
          value={view.subtitleCol || ""}
          onChange={(e) => set({ subtitleCol: e.target.value || undefined })}
        >
          <option value="">None</option>
          {headers.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Status (for board)
        <select
          value={view.statusCol || ""}
          onChange={(e) => set({ statusCol: e.target.value || undefined })}
        >
          <option value="">None</option>
          {headers.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Phone (Call / WhatsApp)
        <select
          value={view.phoneCol || ""}
          onChange={(e) => set({ phoneCol: e.target.value || undefined })}
        >
          <option value="">None</option>
          {headers.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </label>

      <p className="aside-label">Fields on this screen</p>
      <ul className="chip-list">
        {shown.map((c) => (
          <li key={c}>
            {c}
            <button
              type="button"
              onClick={() =>
                set({
                  cols: shown.filter((x) => x !== c),
                  addFields: (view.addFields || []).filter((f) => f.col !== c),
                })
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {hidden.length ? (
        <div className="style-picks">
          {hidden.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                set({
                  cols: [...shown, c],
                  addFields: [...(view.addFields || []), fieldFromCol(c)],
                })
              }
            >
              + {c}
            </button>
          ))}
        </div>
      ) : (
        <p className="hint">All sheet columns are on this screen.</p>
      )}

      <p className="aside-label">Add a screen</p>
      {unusedTables.length ? (
        <div className="add-inline">
          <select value={pickTab} onChange={(e) => setPickTab(e.target.value)}>
            {unusedTables.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button type="button" onClick={addScreen}>
            Add
          </button>
        </div>
      ) : null}
      <div className="add-inline">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New screen name"
        />
        <button type="button" onClick={addBlank}>
          Create
        </button>
      </div>

      <button type="button" className="linkish" onClick={removeScreen}>
        Remove this screen
      </button>
    </>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
