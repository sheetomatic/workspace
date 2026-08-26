"use client";

import { useState } from "react";
import {
  APPSHEET_VIEW_TYPES,
  CARD_LAYOUTS,
  MENU_ICONS,
  VIEW_POSITIONS,
  applyAppSheetViewType,
  defaultIconForView,
  linkToViewExpr,
  viewPosition,
  withViewPosition,
  type AppAction,
  type AppConfig,
  type AppView,
  type CardLayout,
  type GroupAggregate,
  type ViewKind,
  type ViewSort,
} from "@/lib/app-builder";

type Props = {
  view: AppView;
  config: AppConfig;
  tables: string[];
  headers: string[];
  onChange: (patch: Partial<AppView>) => void;
};

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="col-acc view-acc">
      <button type="button" className={open ? "on" : ""} onClick={onToggle}>
        {title}
      </button>
      {open ? <div>{children}</div> : null}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="view-field">
      <span>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

export function ViewInspector({ view, config, tables, headers, onChange }: Props) {
  const [open, setOpen] = useState({
    options: true,
    display: false,
    behavior: false,
    docs: false,
  });
  const slices = (config.slices || []).filter((slice) => slice.tab === view.tab || !view.tab);
  const actions = (config.actions || []).filter((action) => action.viewId === view.id);
  const dataValue = view.sliceId ? `slice:${view.sliceId}` : view.tab;
  const slot = viewPosition(view);

  return (
    <div className="view-insp">
      <Field label="View name" hint="The unique name for this view.">
        <input value={view.name} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>
      <Field label="For this data" hint="Table or slice.">
        <select
          value={dataValue}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw.startsWith("slice:")) {
              const slice = (config.slices || []).find((item) => item.id === raw.slice(6));
              onChange({ sliceId: slice?.id, tab: slice?.tab || view.tab });
              return;
            }
            onChange({ tab: raw, sliceId: undefined });
          }}
        >
          {tables.map((table) => (
            <option key={table} value={table}>
              {table}
            </option>
          ))}
          {slices.map((slice) => (
            <option key={slice.id} value={`slice:${slice.id}`}>
              Slice: {slice.name}
            </option>
          ))}
        </select>
      </Field>

      <p className="aside-label">View type</p>
      <div className="view-types">
        {APPSHEET_VIEW_TYPES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view.kind === item.id ? "on" : ""}
            onClick={() => onChange(applyAppSheetViewType(view, item.id as ViewKind))}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="aside-label">Position</p>
      <div className="view-pos" role="radiogroup" aria-label="Position">
        {VIEW_POSITIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={slot === item.id ? "on" : ""}
            onClick={() => onChange(withViewPosition(item.id))}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Accordion
        title="View Options"
        open={open.options}
        onToggle={() => setOpen((prev) => ({ ...prev, options: !prev.options }))}
      >
        <Field label="Sort by" hint="Sort the rows by one or more columns.">
          {(view.sortBy || []).map((sort, index) => (
            <div className="view-pair" key={`${sort.col}-${index}`}>
              <select
                value={sort.col}
                onChange={(e) =>
                  onChange({
                    sortBy: (view.sortBy || []).map((item, i) =>
                      i === index ? { ...item, col: e.target.value } : item,
                    ),
                  })
                }
              >
                {headers.map((col) => (
                  <option key={col}>{col}</option>
                ))}
              </select>
              <select
                value={sort.dir}
                onChange={(e) =>
                  onChange({
                    sortBy: (view.sortBy || []).map((item, i) =>
                      i === index ? { ...item, dir: e.target.value as ViewSort["dir"] } : item,
                    ),
                  })
                }
              >
                <option value="asc">A → Z</option>
                <option value="desc">Z → A</option>
              </select>
              <button
                type="button"
                className="linkish"
                onClick={() =>
                  onChange({ sortBy: (view.sortBy || []).filter((_, i) => i !== index) })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              onChange({
                sortBy: [...(view.sortBy || []), { col: headers[0] || "Name", dir: "asc" } satisfies ViewSort],
              })
            }
          >
            Add
          </button>
        </Field>
        <Field label="Group by" hint="Group rows by a column.">
          {(view.groupBy || []).map((col, index) => (
            <div className="view-pair" key={`${col}-${index}`}>
              <select
                value={col}
                onChange={(e) =>
                  onChange({
                    groupBy: (view.groupBy || []).map((item, i) => (i === index ? e.target.value : item)),
                  })
                }
              >
                {headers.map((header) => (
                  <option key={header}>{header}</option>
                ))}
              </select>
              <button
                type="button"
                className="linkish"
                onClick={() =>
                  onChange({ groupBy: (view.groupBy || []).filter((_, i) => i !== index) })
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn ghost"
            onClick={() => onChange({ groupBy: [...(view.groupBy || []), headers[0] || "Name"] })}
          >
            Add
          </button>
        </Field>
        <Field label="Group aggregate" hint="Numeric summary of each group.">
          <select
            value={view.groupAggregate || "none"}
            onChange={(e) => onChange({ groupAggregate: e.target.value as GroupAggregate })}
          >
            <option value="none">NONE</option>
            <option value="count">COUNT</option>
            <option value="sum">SUM</option>
            <option value="avg">AVERAGE</option>
          </select>
        </Field>
        {view.groupAggregate === "sum" || view.groupAggregate === "avg" ? (
          <Field label="Aggregate column">
            <select
              value={view.groupAggregateCol || ""}
              onChange={(e) => onChange({ groupAggregateCol: e.target.value || undefined })}
            >
              <option value="">Pick column</option>
              {headers.map((col) => (
                <option key={col}>{col}</option>
              ))}
            </select>
          </Field>
        ) : null}
        <p className="aside-label">Layout</p>
        <div className="view-layout">
          <div className="view-radios">
            {CARD_LAYOUTS.map((item) => (
              <label key={item.id}>
                <input
                  type="radio"
                  name={`layout-${view.id}`}
                  checked={(view.cardLayout || "list") === item.id}
                  onChange={() => onChange({ cardLayout: item.id as CardLayout })}
                />
                {item.label}
              </label>
            ))}
          </div>
          <div className={`view-preview is-${view.cardLayout || "list"}`} aria-hidden>
            <i />
            <b>Title goes here</b>
            <em>Subtitle goes here</em>
          </div>
        </div>
        <Field label="Title column">
          <select value={view.titleCol || ""} onChange={(e) => onChange({ titleCol: e.target.value })}>
            {headers.map((col) => (
              <option key={col}>{col}</option>
            ))}
          </select>
        </Field>
        <Field label="Subtitle">
          <select
            value={view.subtitleCol || ""}
            onChange={(e) => onChange({ subtitleCol: e.target.value || undefined })}
          >
            <option value="">None</option>
            {headers.map((col) => (
              <option key={col}>{col}</option>
            ))}
          </select>
        </Field>
        <Field label="Image">
          <select
            value={view.imageCol || ""}
            onChange={(e) => onChange({ imageCol: e.target.value || undefined })}
          >
            <option value="">None</option>
            {headers.map((col) => (
              <option key={col}>{col}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={view.statusCol || ""}
            onChange={(e) => onChange({ statusCol: e.target.value || undefined })}
          >
            <option value="">None</option>
            {headers.map((col) => (
              <option key={col}>{col}</option>
            ))}
          </select>
        </Field>
        <Field label="Phone">
          <select
            value={view.phoneCol || ""}
            onChange={(e) => onChange({ phoneCol: e.target.value || undefined })}
          >
            <option value="">None</option>
            {headers.map((col) => (
              <option key={col}>{col}</option>
            ))}
          </select>
        </Field>
        {view.kind === "dashboard" ? (
          <>
            <Field label="View entries" hint="Views inside this dashboard.">
              {(view.dashboardViews || []).map((id, index) => (
                <div className="view-pair" key={`${id}-${index}`}>
                  <select
                    value={id}
                    onChange={(e) =>
                      onChange({
                        dashboardViews: (view.dashboardViews || []).map((item, i) =>
                          i === index ? e.target.value : item,
                        ),
                      })
                    }
                  >
                    {config.views
                      .filter((item) => item.id !== view.id)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="linkish"
                    onClick={() =>
                      onChange({
                        dashboardViews: (view.dashboardViews || []).filter((_, i) => i !== index),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const next = config.views.find((item) => item.id !== view.id);
                  if (!next) return;
                  onChange({ dashboardViews: [...(view.dashboardViews || []), next.id] });
                }}
              >
                Add
              </button>
            </Field>
            <label className="check">
              <input
                type="checkbox"
                checked={!!view.dashboardTabs}
                onChange={(e) => onChange({ dashboardTabs: e.target.checked })}
              />
              <span>
                <b>Use tabs in mobile view</b>
                <em>Tabs instead of a scrolling list.</em>
              </span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={!!view.dashboardInteractive}
                onChange={(e) => onChange({ dashboardInteractive: e.target.checked })}
              />
              <span>
                <b>Interactive mode</b>
                <em>Tap a row to filter other views, not leave the dashboard.</em>
              </span>
            </label>
          </>
        ) : null}
      </Accordion>

      <Accordion
        title="Display"
        open={open.display}
        onToggle={() => setOpen((prev) => ({ ...prev, display: !prev.display }))}
      >
        <p className="aside-label">Icon</p>
        <div className="style-picks">
          {MENU_ICONS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={(view.icon || defaultIconForView(view.name)) === item.id ? "on" : ""}
              onClick={() => onChange({ icon: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Field
          label="Display name"
          hint='Name shown in the app. Empty uses the view name. Quote text or use [Column].'
        >
          <input
            value={view.displayName || ""}
            placeholder={`"${view.name}"`}
            onChange={(e) => onChange({ displayName: e.target.value || undefined })}
          />
        </Field>
        <Field label="Show if" hint="Yes/No formula. Hide this view when false.">
          <input
            value={view.showIf || ""}
            placeholder={'USERROLE()="Admin"'}
            onChange={(e) => onChange({ showIf: e.target.value || undefined })}
          />
        </Field>
      </Accordion>

      <Accordion
        title="Behavior"
        open={open.behavior}
        onToggle={() => setOpen((prev) => ({ ...prev, behavior: !prev.behavior }))}
      >
        <Field label="Event Actions" hint="Action to run when a row is opened.">
          <select
            value={view.eventActionId || ""}
            onChange={(e) => onChange({ eventActionId: e.target.value || undefined })}
          >
            <option value="">None</option>
            {actions.map((action: AppAction) => (
              <option key={action.id} value={action.id}>
                {action.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="App link" hint="Deep link to this view.">
          <input readOnly value={linkToViewExpr(view.name)} />
        </Field>
      </Accordion>

      <Accordion
        title="Documentation"
        open={open.docs}
        onToggle={() => setOpen((prev) => ({ ...prev, docs: !prev.docs }))}
      >
        <textarea
          rows={3}
          value={view.notes || ""}
          placeholder="Notes for this view"
          onChange={(e) => onChange({ notes: e.target.value || undefined })}
        />
      </Accordion>
    </div>
  );
}
