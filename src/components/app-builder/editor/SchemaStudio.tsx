"use client";

import { useMemo, useState } from "react";
import {
  makeRelation,
  pickRowIdColumn,
  refColumnName,
  setTableInApp,
  suggestMissingLinks,
  withRefColumnOnView,
  type AppConfig,
} from "@/lib/app-builder";
import type { SheetAdapter } from "../sheet/mockAdapter";

type Props = {
  config: AppConfig;
  sheet: SheetAdapter;
  onChange: (next: AppConfig) => void;
  onDone: () => void;
};

export function SchemaStudio({ config, sheet, onChange, onDone }: Props) {
  const book = sheet.getWorkbook();
  const tabs = Object.values(book.tabs);
  const [parentTab, setParentTab] = useState(
    config.views.find((v) => v.nav !== false)?.tab || tabs[0]?.name || "",
  );
  const [childTab, setChildTab] = useState(
    tabs.find((t) => t.name !== parentTab)?.name || "",
  );
  const parentHeaders = book.tabs[parentTab]?.headers || [];
  const childHeaders = book.tabs[childTab]?.headers || [];
  const [parentKey, setParentKey] = useState(pickRowIdColumn(parentHeaders));
  const [childKey, setChildKey] = useState(refColumnName(parentTab));
  const [note, setNote] = useState("");

  const selected = config.views.filter((v) => v.nav !== false);
  const existing = useMemo(
    () =>
      config.related.map((rel) => ({
        ...rel,
        parentTab:
          config.views.find((v) => v.id === rel.parentViewId)?.tab || rel.parentViewId,
      })),
    [config.related, config.views],
  );
  const missing = suggestMissingLinks(
    selected.map((v) => v.tab),
    existing.map((rel) => ({ parentTab: rel.parentTab, childTab: rel.childTab })),
  );

  function toggle(tabName: string, inApp: boolean) {
    onChange(setTableInApp(config, book, tabName, inApp));
  }

  function link(parentName: string, childName: string, pk?: string, ck?: string) {
    const parentView = config.views.find((v) => v.tab === parentName);
    if (!parentView) {
      setNote(`Tick “${parentName}” first so it is in the app.`);
      return;
    }
    const parentCols = book.tabs[parentName]?.headers || parentView.cols;
    const childCols = [...(book.tabs[childName]?.headers || [])];
    const rowId = pk || pickRowIdColumn(parentCols);
    const ref = ck || refColumnName(parentName);
    if (!childCols.includes(ref)) {
      sheet.addColumn(childName, ref);
      childCols.push(ref);
    }
    const childView = config.views.find((v) => v.tab === childName);
    let next = withRefColumnOnView(config, childName, ref);
    if (!childView && book.tabs[childName]) {
      next = setTableInApp(next, book, childName, true);
    }
    const parent = next.views.find((v) => v.tab === parentName);
    if (!parent) return;
    if (
      next.related.some(
        (rel) => rel.parentViewId === parent.id && rel.childTab === childName,
      )
    ) {
      setNote(`${parentName} → ${childName} is already linked.`);
      return;
    }
    next = {
      ...next,
      related: [
        ...next.related,
        makeRelation({
          parentView: parent,
          childTab: childName,
          childViewId: next.views.find((v) => v.tab === childName)?.id,
          parentKey: rowId,
          childKey: ref,
          childHeaders: childCols,
        }),
      ],
    };
    onChange(next);
    setNote(
      `Linked ${parentName}.${rowId} → ${childName}.${ref}. New child rows can store that parent id.`,
    );
  }

  return (
    <div className="schema-studio">
      <header>
        <h2>Tables & relations</h2>
        <p>
          Tick tables for the phone. Then say if one table is the parent of
          another — even if Excel has no link yet. We add a{" "}
          <code>ref_</code> column on the child and use the parent row id.
        </p>
      </header>

      <section>
        <h3>1. Tables in this app</h3>
        <ul className="schema-tables">
          {tabs.map((tab) => {
            const view = config.views.find((v) => v.tab === tab.name);
            const on = view ? view.nav !== false : false;
            return (
              <li key={tab.name} className={on ? "on" : ""}>
                <label>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => toggle(tab.name, e.target.checked)}
                  />
                  <strong>{tab.name}</strong>
                  <em>{tab.rows.length} rows</em>
                </label>
              </li>
            );
          })}
        </ul>
        {selected.length ? (
          <p className="schema-inapp">
            In the app: {selected.map((v) => v.name).join(" · ")}
          </p>
        ) : (
          <p className="hint">Tick at least one table staff should open.</p>
        )}
      </section>

      <section>
        <h3>2. Should these be parent and child?</h3>
        <p className="hint">
          We read the names. Accept a guess, or skip — you can still add your
          own link below.
        </p>
        {missing.length === 0 ? (
          <p className="hint">No extra parent–child guesses right now.</p>
        ) : (
          <ul className="schema-asks">
            {missing.map((item) => (
              <li key={`${item.parentTab}-${item.childTab}`}>
                <div>
                  <strong>
                    {item.parentTab} → {item.childTab}
                  </strong>
                  <p>{item.reason}. Parent row id + child {refColumnName(item.parentTab)}.</p>
                </div>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => link(item.parentTab, item.childTab)}
                >
                  Link
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>3. Add a parent → child link</h3>
        <p className="hint">
          Parent row id is the unique column on the parent. Child ref is the
          column that stores that id — we create it if it is missing.
        </p>
        <div className="schema-add">
          <label>
            Parent table
            <select
              value={parentTab}
              onChange={(e) => {
                const next = e.target.value;
                setParentTab(next);
                setParentKey(pickRowIdColumn(book.tabs[next]?.headers || []));
                setChildKey(refColumnName(next));
              }}
            >
              {tabs.map((t) => (
                <option key={t.name}>{t.name}</option>
              ))}
            </select>
          </label>
          <label>
            Parent row id
            <select
              value={parentKey}
              onChange={(e) => setParentKey(e.target.value)}
            >
              {parentHeaders.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
          <label>
            Child table
            <select
              value={childTab}
              onChange={(e) => {
                setChildTab(e.target.value);
                const nextRef = refColumnName(parentTab);
                const heads = book.tabs[e.target.value]?.headers || [];
                setChildKey(heads.includes(nextRef) ? nextRef : nextRef);
              }}
            >
              {tabs
                .filter((t) => t.name !== parentTab)
                .map((t) => (
                  <option key={t.name}>{t.name}</option>
                ))}
            </select>
          </label>
          <label>
            Child ref column
            <input
              value={childKey}
              onChange={(e) => setChildKey(e.target.value)}
              placeholder={refColumnName(parentTab)}
              list="schema-child-cols"
            />
            <datalist id="schema-child-cols">
              {childHeaders.map((h) => (
                <option key={h} value={h} />
              ))}
              <option value={refColumnName(parentTab)} />
            </datalist>
          </label>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (!parentTab || !childTab || !parentKey || !childKey.trim()) {
                setNote("Pick parent, child, row id, and ref column.");
                return;
              }
              link(parentTab, childTab, parentKey, childKey.trim());
            }}
          >
            Create link
          </button>
        </div>
      </section>

      <section>
        <h3>Linked now</h3>
        {existing.length === 0 ? (
          <p className="hint">No parent–child links yet.</p>
        ) : (
          <ul className="schema-linked">
            {existing.map((rel) => (
              <li key={rel.id}>
                <span>
                  {rel.parentTab}.{rel.parentKeys[0]} → {rel.childTab}.
                  {rel.childKeys[0]}
                </span>
                <button
                  type="button"
                  className="linkish"
                  onClick={() =>
                    onChange({
                      ...config,
                      related: config.related.filter((r) => r.id !== rel.id),
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {note ? <p className="build-note">{note}</p> : null}

      <div className="schema-done">
        <button type="button" className="btn primary" onClick={onDone}>
          Done — see the phone
        </button>
      </div>
    </div>
  );
}
