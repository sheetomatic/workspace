import type { AppConfig, SheetTab } from "./index";

function renameKey<T extends Record<string, unknown>>(row: T, from: string, to: string): T {
  if (from === to || !(from in row)) return row;
  const next = { ...row };
  next[to] = next[from];
  delete next[from];
  return next;
}

export function renameTabColumn(tab: SheetTab, from: string, to: string): SheetTab {
  const name = to.trim();
  if (!name || name === from || tab.headers.includes(name)) return tab;
  return {
    ...tab,
    headers: tab.headers.map((col) => (col === from ? name : col)),
    rows: tab.rows.map((row) => ({
      ...row,
      cells: renameKey(row.cells, from, name),
    })),
  };
}

export function deleteTabColumn(tab: SheetTab, name: string): SheetTab {
  return {
    ...tab,
    headers: tab.headers.filter((col) => col !== name),
    rows: tab.rows.map((row) => {
      const cells = { ...row.cells };
      delete cells[name];
      return { ...row, cells };
    }),
  };
}

function swap(value: string | undefined, from: string, to: string) {
  return value === from ? to : value;
}

export function renameColumnInConfig(config: AppConfig, tab: string, from: string, to: string): AppConfig {
  const name = to.trim();
  if (!name || name === from) return config;
  return {
    ...config,
    views: config.views.map((view) => {
      if (view.tab !== tab) return view;
      return {
        ...view,
        cols: view.cols.map((col) => (col === from ? name : col)),
        titleCol: swap(view.titleCol, from, name),
        subtitleCol: swap(view.subtitleCol, from, name),
        statusCol: swap(view.statusCol, from, name),
        phoneCol: swap(view.phoneCol, from, name),
        imageCol: swap(view.imageCol, from, name),
        ownerCol: swap(view.ownerCol, from, name),
        keyCol: swap(view.keyCol, from, name),
        sliceCols: view.sliceCols?.map((col) => (col === from ? name : col)),
        addFields: view.addFields?.map((field) =>
          field.col === from ? { ...field, col: name, name, label: field.label === from ? name : field.label } : field,
        ),
        editFields: view.editFields?.map((field) =>
          field.col === from ? { ...field, col: name, name, label: field.label === from ? name : field.label } : field,
        ),
      };
    }),
    computed: (config.computed || []).map((col) =>
      col.tab === tab && col.name === from ? { ...col, name } : col,
    ),
    visibility: (config.visibility || []).map((rule) =>
      rule.target === "field" && rule.targetId === from ? { ...rule, targetId: name } : rule,
    ),
    related: config.related.map((rel) => ({
      ...rel,
      parentKeys: rel.parentKeys.map((key) => (key === from ? name : key)),
      childKeys: rel.childTab === tab ? rel.childKeys.map((key) => (key === from ? name : key)) : rel.childKeys,
      cols: rel.childTab === tab ? rel.cols.map((col) => (col === from ? name : col)) : rel.cols,
    })),
  };
}

export function deleteColumnInConfig(config: AppConfig, tab: string, name: string): AppConfig {
  return {
    ...config,
    views: config.views.map((view) => {
      if (view.tab !== tab) return view;
      const drop = (value?: string) => (value === name ? undefined : value);
      return {
        ...view,
        cols: view.cols.filter((col) => col !== name),
        titleCol: drop(view.titleCol),
        subtitleCol: drop(view.subtitleCol),
        statusCol: drop(view.statusCol),
        phoneCol: drop(view.phoneCol),
        imageCol: drop(view.imageCol),
        ownerCol: drop(view.ownerCol),
        keyCol: drop(view.keyCol),
        sliceCols: view.sliceCols?.filter((col) => col !== name),
        addFields: view.addFields?.filter((field) => field.col !== name),
        editFields: view.editFields?.filter((field) => field.col !== name),
      };
    }),
    computed: (config.computed || []).filter((col) => !(col.tab === tab && col.name === name)),
    visibility: (config.visibility || []).filter(
      (rule) => !(rule.target === "field" && rule.targetId === name),
    ),
  };
}
