import { useState } from "react";
import {
  APPSHEET_VIEW_TYPES,
  applyAppSheetViewType,
  defaultIconForView,
  FIELD_TYPE_OPTIONS,
  fieldTypeOf,
  MENU_ICONS,
  relatedForView,
  withColumnType,
  type AppAction,
  type AppComputedColumn,
  type AppConfig,
  type AppFormField,
  type AppView,
  type FieldType,
} from "@/lib/app-builder";
import { fieldFromColumn } from "@/lib/app-builder/infer";
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
  return fieldFromColumn(col);
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
    return (
      <HomeDesign
        config={config}
        sheet={sheet}
        tables={tables}
        onChange={onChange}
        onFocus={onFocus}
      />
    );
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

function viewFromTab(tab: string, sheet: SheetAdapter, hub = "App"): AppView {
  const heads = sheet.getTab(tab)?.headers.length
    ? sheet.getTab(tab)!.headers
    : ["Name"];
  return {
    id: slug(tab) + "-" + Date.now().toString().slice(-4),
    hub,
    name: tab,
    kind: "deck",
    tab,
    titleCol: heads[0],
    subtitleCol: heads[1],
    cols: heads,
    collectionStyle: "list",
    nav: true,
    addFields: heads.map(fieldFromCol),
    editFields: heads.map(fieldFromCol),
  };
}

function HomeDesign({
  config,
  sheet,
  tables,
  onChange,
  onFocus,
}: {
  config: AppConfig;
  sheet: SheetAdapter;
  tables: string[];
  onChange: (c: AppConfig) => void;
  onFocus: (id: string) => void;
}) {
  const m = config.meta;
  const unused = tables.filter((t) => !config.views.some((v) => v.tab === t));
  function meta(patch: Partial<typeof m>) {
    onChange({ ...config, meta: { ...m, ...patch } });
  }
  return (
    <>
      <ThemePicker meta={m} onChange={meta} />
      <h3>Tables in this app</h3>
      <p className="hint">
        Checked tables show as apps on the phone Home. Uncheck to hide. Remove
        drops the screen — the Sheet tab stays.
      </p>
      <ul className="table-picks">
        {config.views.map((view) => (
          <li key={view.id}>
            <label>
              <input
                type="checkbox"
                checked={view.nav !== false}
                onChange={(e) =>
                  onChange(patchView(config, view.id, { nav: e.target.checked }))
                }
              />
              <span>
                {view.name}
                {view.tab !== view.name ? <em> · {view.tab}</em> : null}
              </span>
            </label>
            <button
              type="button"
              className="linkish"
              onClick={() => {
                onChange({
                  ...config,
                  views: config.views.filter((v) => v.id !== view.id),
                  related: config.related.filter((r) => r.parentViewId !== view.id),
                });
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {unused.length ? (
        <>
          <p className="aside-label">Add a table</p>
          <div className="table-add">
            {unused.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  const next = viewFromTab(tab, sheet);
                  onChange({ ...config, views: [...config.views, next] });
                  onFocus(next.id);
                }}
              >
                + {tab}
              </button>
            ))}
          </div>
        </>
      ) : null}
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
      <p className="aside-label">Show / hide</p>
      <Toggle
        label="Brand in header"
        on={m.showBrand !== false}
        onChange={(v) => meta({ showBrand: v })}
      />
      <Toggle
        label="Apps on Home"
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

      <p className="hint">AppSheet view type</p>
      <div className="style-picks">
        {APPSHEET_VIEW_TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view.kind === item.id || view.collectionStyle === item.style ? "on" : ""}
            onClick={() => set(applyAppSheetViewType(view, item.id))}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="hint">Menu icon</p>
      <div className="style-picks">
        {MENU_ICONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={(view.icon || defaultIconForView(view.name)) === item.id ? "on" : ""}
            onClick={() => set({ icon: item.id })}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Toggle
        label="Show as app on Home"
        on={view.nav !== false}
        onChange={(v) => set({ nav: v })}
      />
      <Toggle
        label="Allow delete"
        on={view.allowDelete !== false}
        onChange={(v) => set({ allowDelete: v })}
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
        Image
        <select
          value={view.imageCol || ""}
          onChange={(e) => set({ imageCol: e.target.value || undefined })}
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
            <select
              className="col-type"
              aria-label={`Type for ${c}`}
              value={fieldTypeOf(view, c)}
              onChange={(e) =>
                onChange(withColumnType(config, view.tab, c, e.target.value as FieldType))
              }
            >
              {FIELD_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
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

      <label className="field-label">
        Row owner (staff sees only their rows)
        <select
          value={view.ownerCol || ""}
          onChange={(e) => set({ ownerCol: e.target.value || undefined })}
        >
          <option value="">Everyone</option>
          {headers.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </label>

      <RelationsEditor config={config} view={view} tables={tables} sheet={sheet} onChange={onChange} />
      <GlideExtrasEditor
        config={config}
        view={view}
        headers={headers}
        sheet={sheet}
        onChange={onChange}
      />

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

function GlideExtrasEditor({
  config,
  view,
  headers,
  sheet,
  onChange,
}: {
  config: AppConfig;
  view: AppView;
  headers: string[];
  sheet: SheetAdapter;
  onChange: (c: AppConfig) => void;
}) {
  const computed = (config.computed || []).filter((col) => col.tab === view.tab);
  const actions = (config.actions || []).filter((action) => action.viewId === view.id);
  const relations = config.related.filter(
    (rel) => rel.parentViewId === view.id || rel.childTab === view.tab,
  );
  const allCols = [...headers, ...computed.map((col) => col.name)];
  const fieldRules = (config.visibility || []).filter(
    (rule) => rule.target === "field" && allCols.includes(rule.targetId),
  );

  function lookupCols(relationId?: string) {
    const rel = relations.find((item) => item.id === relationId) || relations[0];
    if (!rel) return [];
    if (rel.childTab === view.tab) {
      const parent = config.views.find((item) => item.id === rel.parentViewId);
      return sheet.getTab(parent?.tab || "")?.headers || parent?.cols || [];
    }
    return sheet.getTab(rel.childTab)?.headers || rel.cols;
  }

  function patchComputed(id: string, patch: Partial<AppComputedColumn>) {
    onChange({
      ...config,
      computed: (config.computed || []).map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  }

  function patchAction(id: string, patch: (action: AppAction) => AppAction) {
    onChange({
      ...config,
      actions: (config.actions || []).map((item) => (item.id === id ? patch(item) : item)),
    });
  }

  function addComputed(kind: AppComputedColumn["kind"]) {
    const name =
      kind === "math"
        ? "Line Amount"
        : kind === "lookup"
          ? "Lookup"
          : kind === "formula"
            ? "Formula"
            : "Flag";
    const rel = relations[0];
    const next: AppComputedColumn = {
      id: `${view.tab}-${kind}-${Date.now().toString().slice(-4)}`,
      tab: view.tab,
      name,
      kind,
      leftCol: headers[0],
      rightCol: headers[1],
      op: "mul",
      relationId: rel?.id,
      lookupCol: lookupCols(rel?.id)[0],
      whenCol: view.statusCol || headers[0],
      whenOp: "eq",
      whenValue: "Open",
      thenValue: "Needs action",
      elseValue: "Ok",
      formula: headers[0] ? `CONCATENATE([${headers[0]}])` : "[Name]",
    };
    onChange({
      ...config,
      computed: [...(config.computed || []), next],
      views: config.views.map((item) =>
        item.id === view.id && !item.cols.includes(name)
          ? { ...item, cols: [...item.cols, name] }
          : item,
      ),
    });
  }

  function addAction() {
    const next: AppAction = {
      id: `act-${Date.now().toString().slice(-4)}`,
      label: "Mark done",
      viewId: view.id,
      steps: [
        { kind: "set", col: view.statusCol || headers[0], value: "Done" },
        { kind: "notify", message: "Updated" },
      ],
    };
    onChange({ ...config, actions: [...(config.actions || []), next] });
  }

  return (
    <>
      <p className="aside-label">Computed columns</p>
      <p className="hint">
        Glide: lookup, math, if-then. AppSheet: + Formula with [Col]. Shown on
        the phone, not written back to the Sheet.
      </p>
      {computed.map((col) => (
        <div className="rel-add" key={col.id}>
          <input value={col.name} onChange={(e) => patchComputed(col.id, { name: e.target.value })} />
          {col.kind === "math" ? (
            <>
              <select
                value={col.leftCol || ""}
                onChange={(e) => patchComputed(col.id, { leftCol: e.target.value })}
              >
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
              <select
                value={col.op || "mul"}
                onChange={(e) =>
                  patchComputed(col.id, { op: e.target.value as AppComputedColumn["op"] })
                }
              >
                <option value="mul">×</option>
                <option value="add">+</option>
                <option value="sub">−</option>
                <option value="div">÷</option>
              </select>
              <select
                value={col.rightCol || ""}
                onChange={(e) => patchComputed(col.id, { rightCol: e.target.value })}
              >
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </>
          ) : null}
          {col.kind === "lookup" ? (
            <>
              <select
                value={col.relationId || ""}
                onChange={(e) =>
                  patchComputed(col.id, {
                    relationId: e.target.value,
                    lookupCol: lookupCols(e.target.value)[0],
                  })
                }
              >
                {relations.length ? (
                  relations.map((rel) => (
                    <option key={rel.id} value={rel.id}>
                      {rel.name}
                    </option>
                  ))
                ) : (
                  <option value="">Add a relation first</option>
                )}
              </select>
              <select
                value={col.lookupCol || ""}
                onChange={(e) => patchComputed(col.id, { lookupCol: e.target.value })}
              >
                {lookupCols(col.relationId).map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </>
          ) : null}
          {col.kind === "formula" ? (
            <input
              value={col.formula || ""}
              placeholder={'CONCATENATE([Name]," — ",[Company])'}
              onChange={(e) => patchComputed(col.id, { formula: e.target.value })}
            />
          ) : null}
          {col.kind === "if" ? (
            <>
              <select
                value={col.whenCol || ""}
                onChange={(e) => patchComputed(col.id, { whenCol: e.target.value })}
              >
                {headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
              <select
                value={col.whenOp || "eq"}
                onChange={(e) =>
                  patchComputed(col.id, { whenOp: e.target.value as AppComputedColumn["whenOp"] })
                }
              >
                <option value="eq">=</option>
                <option value="neq">≠</option>
                <option value="empty">empty</option>
                <option value="notempty">filled</option>
              </select>
              {col.whenOp === "empty" || col.whenOp === "notempty" ? null : (
                <input
                  value={col.whenValue || ""}
                  placeholder="When"
                  onChange={(e) => patchComputed(col.id, { whenValue: e.target.value })}
                />
              )}
              <input
                value={col.thenValue || ""}
                placeholder="Then"
                onChange={(e) => patchComputed(col.id, { thenValue: e.target.value })}
              />
              <input
                value={col.elseValue || ""}
                placeholder="Else"
                onChange={(e) => patchComputed(col.id, { elseValue: e.target.value })}
              />
            </>
          ) : null}
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                computed: (config.computed || []).filter((item) => item.id !== col.id),
              })
            }
          >
            Remove
          </button>
        </div>
      ))}
      <div className="style-picks">
        <button type="button" onClick={() => addComputed("math")}>+ Math</button>
        <button type="button" onClick={() => addComputed("lookup")}>+ Lookup</button>
        <button type="button" onClick={() => addComputed("if")}>+ If-then</button>
        <button type="button" onClick={() => addComputed("formula")}>+ Formula</button>
      </div>

      <p className="aside-label">Visibility</p>
      <p className="hint">Hide this screen from staff, or hide a field unless the person is owner.</p>
      <Toggle
        label="Staff can open this screen"
        on={!config.visibility?.some((rule) => rule.target === "view" && rule.targetId === view.id && rule.when === "owner")}
        onChange={(on) => {
          const rest = (config.visibility || []).filter(
            (rule) => !(rule.target === "view" && rule.targetId === view.id),
          );
          onChange({
            ...config,
            visibility: on
              ? rest
              : [...rest, { id: `vis-${view.id}`, target: "view", targetId: view.id, when: "owner" }],
          });
        }}
      />
      {fieldRules.map((rule) => (
        <div className="rel-add" key={rule.id}>
          <span>{rule.targetId} · owner only</span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                visibility: (config.visibility || []).filter((item) => item.id !== rule.id),
              })
            }
          >
            Remove
          </button>
        </div>
      ))}
      <div className="add-inline">
        <select
          defaultValue=""
          onChange={(e) => {
            const targetId = e.target.value;
            if (!targetId) return;
            e.target.value = "";
            if (fieldRules.some((rule) => rule.targetId === targetId)) return;
            onChange({
              ...config,
              visibility: [
                ...(config.visibility || []),
                { id: `vis-field-${targetId}`, target: "field", targetId, when: "owner" },
              ],
            });
          }}
        >
          <option value="">Hide field from staff…</option>
          {allCols
            .filter((col) => !fieldRules.some((rule) => rule.targetId === col))
            .map((col) => (
              <option key={col}>{col}</option>
            ))}
        </select>
      </div>

      <p className="aside-label">Action buttons</p>
      {actions.map((action) => {
        const setStep = action.steps.find((step) => step.kind === "set");
        const notifyStep = action.steps.find((step) => step.kind === "notify");
        return (
          <div className="rel-add" key={action.id}>
            <input
              value={action.label}
              onChange={(e) => patchAction(action.id, (item) => ({ ...item, label: e.target.value }))}
            />
            <select
              value={setStep?.col || ""}
              onChange={(e) =>
                patchAction(action.id, (item) => ({
                  ...item,
                  steps: item.steps.map((step) =>
                    step.kind === "set" ? { ...step, col: e.target.value } : step,
                  ),
                }))
              }
            >
              {allCols.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
            <input
              value={setStep?.value || ""}
              placeholder="{{now}} or Done"
              onChange={(e) =>
                patchAction(action.id, (item) => ({
                  ...item,
                  steps: item.steps.map((step) =>
                    step.kind === "set" ? { ...step, value: e.target.value } : step,
                  ),
                }))
              }
            />
            <input
              value={notifyStep?.message || ""}
              placeholder="Toast"
              onChange={(e) =>
                patchAction(action.id, (item) => ({
                  ...item,
                  steps: item.steps.map((step) =>
                    step.kind === "notify" ? { ...step, message: e.target.value } : step,
                  ),
                }))
              }
            />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...config,
                  actions: (config.actions || []).filter((item) => item.id !== action.id),
                })
              }
            >
              Remove
            </button>
          </div>
        );
      })}
      <button type="button" onClick={addAction}>
        + Action sequence
      </button>
    </>
  );
}

function RelationsEditor({
  config,
  view,
  tables,
  sheet,
  onChange,
}: {
  config: AppConfig;
  view: AppView;
  tables: string[];
  sheet: SheetAdapter;
  onChange: (c: AppConfig) => void;
}) {
  const existing = relatedForView(config, view.id);
  const [childTab, setChildTab] = useState(tables.find((t) => t !== view.tab) || "");
  const childHeaders = sheet.getTab(childTab)?.headers || [];
  const [parentKey, setParentKey] = useState(view.titleCol || view.cols[0] || "");
  const [childKey, setChildKey] = useState(childHeaders[0] || "");

  return (
    <>
      <p className="aside-label">Relations</p>
      <p className="hint">Match a column here to a column on another table — like Glide.</p>
      {existing.map((rel) => (
        <div className="rel-row" key={rel.id}>
          <span>
            {rel.name}: {rel.parentKeys[0]} → {rel.childTab}.{rel.childKeys[0]}
          </span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                related: config.related.filter((r) => r.id !== rel.id),
              })
            }
          >
            Remove
          </button>
        </div>
      ))}
      {tables.length > 1 ? (
        <div className="rel-add">
          <select value={parentKey} onChange={(e) => setParentKey(e.target.value)}>
            {(sheet.getTab(view.tab)?.headers || view.cols).map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
          <select
            value={childTab}
            onChange={(e) => {
              setChildTab(e.target.value);
              setChildKey(sheet.getTab(e.target.value)?.headers[0] || "");
            }}
          >
            {tables.filter((t) => t !== view.tab).map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select value={childKey} onChange={(e) => setChildKey(e.target.value)}>
            {childHeaders.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              if (!childTab || !parentKey || !childKey) return;
              const childView = config.views.find((v) => v.tab === childTab);
              const heads = sheet.getTab(childTab)?.headers || [];
              onChange({
                ...config,
                related: [
                  ...config.related,
                  {
                    id: `${view.id}__${childTab}-${Date.now().toString().slice(-4)}`,
                    name: childTab,
                    parentViewId: view.id,
                    childTab,
                    childViewId: childView?.id,
                    parentKeys: [parentKey],
                    childKeys: [childKey],
                    cols: heads.filter((h) => h !== childKey).slice(0, 4),
                    addFields: heads.filter((h) => h !== childKey).map(fieldFromCol),
                  },
                ],
              });
            }}
          >
            Link
          </button>
        </div>
      ) : null}
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
