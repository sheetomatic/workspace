import type { AppConfig, AppRelated, AppView, SheetTab, SheetWorkbook } from "./index";
import { fieldFromColumn, pickTitleCol } from "./infer";

export interface MissingLink {
  parentTab: string;
  childTab: string;
  reason: string;
}

const NAME_LINKS: { parent: RegExp; child: RegExp; reason: string }[] = [
  {
    parent: /customer|party|client/i,
    child: /sale|order|invoice/i,
    reason: "Sales usually belong to a customer",
  },
  {
    parent: /sale|order|invoice/i,
    child: /payment|receipt|collection/i,
    reason: "Payments usually belong to a sale",
  },
  {
    parent: /product|item|sku|rate/i,
    child: /sale|order|stock/i,
    reason: "Sales and stock usually point at a product",
  },
  {
    parent: /customer|party|client/i,
    child: /payment|receipt|collection/i,
    reason: "Payments can also point at a customer",
  },
];

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "table"
  );
}

export function pickRowIdColumn(headers: string[]): string {
  return (
    headers.find((h) => /^(id|row[_ ]?id|_row|code|no)$/i.test(h)) ||
    headers.find((h) => /\bid\b|code|no\b/i.test(h)) ||
    headers[0] ||
    "id"
  );
}

export function refColumnName(parentTab: string): string {
  const base =
    parentTab
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .replace(/s$/, "") || "parent";
  return `ref_${base}`;
}

export function suggestMissingLinks(
  selectedTabs: string[],
  existing: { parentTab: string; childTab: string }[],
): MissingLink[] {
  const selected = selectedTabs.map((name) => name.trim()).filter(Boolean);
  const linked = new Set(
    existing.map((rel) => `${rel.parentTab}→${rel.childTab}`.toLowerCase()),
  );
  const out: MissingLink[] = [];
  for (const parent of selected) {
    for (const child of selected) {
      if (parent === child) continue;
      if (linked.has(`${parent}→${child}`.toLowerCase())) continue;
      const hit = NAME_LINKS.find(
        (rule) => rule.parent.test(parent) && rule.child.test(child),
      );
      if (!hit) continue;
      if (
        out.some(
          (item) => item.parentTab === parent && item.childTab === child,
        )
      ) {
        continue;
      }
      out.push({ parentTab: parent, childTab: child, reason: hit.reason });
    }
  }
  return out;
}

export function viewFromWorkbookTab(tab: SheetTab): AppView {
  const titleCol = pickTitleCol(tab.headers);
  const fields = tab.headers.map((h) => fieldFromColumn(h));
  return {
    id: slug(tab.name) + "-" + Date.now().toString().slice(-4),
    hub: "App",
    name: tab.name,
    kind: "deck",
    tab: tab.name,
    titleCol,
    subtitleCol: tab.headers.find((h) => h !== titleCol),
    cols: tab.headers.length ? tab.headers : ["Name"],
    sliceCols: [titleCol],
    nav: true,
    collectionStyle: "list",
    allowDelete: true,
    addFields: fields,
    editFields: fields,
  };
}

export function setTableInApp(
  config: AppConfig,
  workbook: SheetWorkbook,
  tabName: string,
  inApp: boolean,
): AppConfig {
  const existing = config.views.find((v) => v.tab === tabName);
  if (existing) {
    return {
      ...config,
      views: config.views.map((v) =>
        v.tab === tabName ? { ...v, nav: inApp } : v,
      ),
    };
  }
  if (!inApp) return config;
  const tab = workbook.tabs[tabName];
  if (!tab) return config;
  return { ...config, views: [...config.views, viewFromWorkbookTab(tab)] };
}

export function makeRelation(input: {
  parentView: AppView;
  childTab: string;
  childViewId?: string;
  parentKey: string;
  childKey: string;
  childHeaders: string[];
}): AppRelated {
  const cols = input.childHeaders.filter((h) => h !== input.childKey);
  return {
    id: `${input.parentView.id}__${slug(input.childTab)}-${Date.now().toString().slice(-4)}`,
    name: input.childTab,
    parentViewId: input.parentView.id,
    childTab: input.childTab,
    childViewId: input.childViewId,
    parentKeys: [input.parentKey],
    childKeys: [input.childKey],
    cols: cols.slice(0, 4),
    addFields: cols.map((h) => fieldFromColumn(h)),
  };
}

export function withRefColumnOnView(
  config: AppConfig,
  childTab: string,
  childKey: string,
): AppConfig {
  return {
    ...config,
    views: config.views.map((view) => {
      if (view.tab !== childTab) return view;
      if (view.cols.includes(childKey)) return view;
      const field = fieldFromColumn(childKey);
      return {
        ...view,
        cols: [...view.cols, childKey],
        addFields: [...(view.addFields || []), field],
        editFields: [...(view.editFields || []), field],
      };
    }),
  };
}
