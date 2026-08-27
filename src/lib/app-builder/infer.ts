import type {
  AppConfig,
  AppFormField,
  AppRelated,
  AppView,
  CellValue,
  SheetTab,
  SheetWorkbook,
} from "./index";
import { normKey } from "./index";
import { defaultComputedForTab } from "./glide-extras";

const LINE_TAB = /line|lines|detail|details|entries|items line/i;
const USER_TAB = /^(users|staff|team|members)$/i;
const HELPER_TAB =
  /^(home|howto|apply|practice|pivot|piv|chart|graph|import|export|raw|dump|archive|calc|lookup|mapping|settings?|config|temp|backup|copy|gs|agent|live|analysis|dashboard)$|dirty|import.?hub|analyst|live.?filter|market.?watch|pivot|chart.?data/i;

export function defaultNavForTab(name: string): boolean {
  if (LINE_TAB.test(name) || USER_TAB.test(name) || HELPER_TAB.test(name)) {
    return false;
  }
  return true;
}

function slug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "screen"
  );
}

function samples(tab: SheetTab, col: string): CellValue[] {
  return tab.rows.slice(0, 40).map((row) => row.cells[col]);
}

export function inferFieldType(col: string, values: CellValue[] = []): AppFormField["type"] {
  if (/phone|mobile|whatsapp|whats\s*app/i.test(col)) return "phone";
  if (/photo|image|picture|img|^logo$/i.test(col)) return "image";
  if (/e-?mail/i.test(col)) return "email";
  if (/date|due|when|timestamp|created.?at|updated.?at/i.test(col)) return "date";
  if (/status|stage|priority/i.test(col)) return "enum";
  if (/qty|quantity|rate|amount|stock|price|count|hours|days/i.test(col)) return "number";
  const filled = values.filter((v) => v != null && String(v).trim() !== "");
  if (
    filled.length >= 3 &&
    filled.every((v) => typeof v === "number" || /^-?[\d,.]+$/.test(String(v).trim()))
  ) {
    return "number";
  }
  const unique = new Set(filled.map((v) => String(v).trim()));
  if (filled.length >= 4 && unique.size > 1 && unique.size <= 8 && unique.size <= filled.length / 2) {
    return "choice";
  }
  return "text";
}

export function fieldFromColumn(col: string, values: CellValue[] = []): AppFormField {
  const type = inferFieldType(col, values);
  const unique = [
    ...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean)),
  ].slice(0, 20);
  return {
    name: col.toLowerCase().replace(/\s+/g, ""),
    label: col,
    col,
    type,
    required: /^(name|title|order no|id|party|item|task)$/i.test(col),
    options: type === "choice" || type === "enum" ? unique : undefined,
  };
}

export function pickTitleCol(headers: string[]): string {
  return (
    headers.find((h) =>
      /^(name|title|party name|item|task|order no|lead|visitor)$/i.test(h),
    ) ||
    headers[0] ||
    "Name"
  );
}

function pickSubtitleCol(headers: string[], title: string): string | undefined {
  const skip = normKey(title);
  return (
    headers.find(
      (h) =>
        normKey(h) !== skip && /party|city|owner|status|date|phone|company/i.test(h),
    ) || headers.find((h) => normKey(h) !== skip)
  );
}

function pickNamed(headers: string[], pattern: RegExp): string | undefined {
  return headers.find((h) => pattern.test(h));
}

function uniqueRatio(tab: SheetTab, col: string): number {
  const vals = tab.rows.map((row) => normKey(row.cells[col])).filter(Boolean);
  if (!vals.length) return 0;
  return new Set(vals).size / vals.length;
}

function looksLikeKey(col: string): boolean {
  return /no\b|id\b|code\b|name\b|^party$|^item$|^task$/i.test(col);
}

export function columnsMatch(a: string, b: string): boolean {
  const left = normKey(a);
  const right = normKey(b);
  if (left === right) return true;
  const strip = (s: string) => s.replace(/ name$/, "").replace(/s$/, "");
  return strip(left) === strip(right);
}

function attachChoiceSources(
  field: AppFormField,
  workbook: SheetWorkbook,
  thisTab: string,
): AppFormField {
  for (const tab of Object.values(workbook.tabs)) {
    if (tab.name === thisTab || !tab.headers.length) continue;
    const title = pickTitleCol(tab.headers);
    if (columnsMatch(field.col, title) || columnsMatch(field.col, tab.name.replace(/s$/i, ""))) {
      return { ...field, type: "choice", choiceTab: tab.name, choiceCol: title };
    }
  }
  return field;
}

export function inferRelations(workbook: SheetWorkbook, views: AppView[]): AppRelated[] {
  const tabs = Object.values(workbook.tabs).filter((tab) => tab.headers.length);
  const related: AppRelated[] = [];

  for (const parent of tabs) {
    for (const child of tabs) {
      if (parent.name === child.name) continue;
      const parentView = views.find((v) => v.tab === parent.name);
      const childView = views.find((v) => v.tab === child.name);
      if (!parentView) continue;

      for (const pk of parent.headers) {
        for (const ck of child.headers) {
          if (!columnsMatch(pk, ck)) continue;
          if (!looksLikeKey(pk) && !looksLikeKey(ck)) continue;
          const parentUnique = uniqueRatio(parent, pk);
          const childUnique = uniqueRatio(child, ck);
          if (parent.rows.length > 1 && parentUnique < 0.55) continue;
          if (child.rows.length > 1 && childUnique > parentUnique && childUnique > 0.95) continue;

          const id = `${parentView.id}__${slug(child.name)}`;
          if (
            related.some(
              (rel) =>
                rel.id === id ||
                (rel.parentViewId === parentView.id && rel.childTab === child.name),
            )
          ) {
            continue;
          }

          const cols = child.headers.filter((h) => !columnsMatch(h, ck));
          related.push({
            id,
            name: child.name,
            parentViewId: parentView.id,
            childTab: child.name,
            childViewId: childView?.id,
            parentKeys: [pk],
            childKeys: [ck],
            cols: cols.slice(0, 4),
            addFields: cols.map((h) => fieldFromColumn(h, samples(child, h))),
          });
        }
      }
    }
  }

  return related;
}

export function inferAppFromWorkbook(workbook: SheetWorkbook, appName?: string): AppConfig {
  const tabs = Object.values(workbook.tabs).filter(
    (tab) => tab.headers.length > 0 && !USER_TAB.test(tab.name),
  );

  const views: AppView[] = tabs.map((tab) => {
    const titleCol = pickTitleCol(tab.headers);
    const fields = tab.headers.map((h) =>
      attachChoiceSources(fieldFromColumn(h, samples(tab, h)), workbook, tab.name),
    );
    const statusCol = pickNamed(tab.headers, /status|stage|state/i);
    return {
      id: slug(tab.name),
      hub: "App",
      name: tab.name,
      kind: "deck",
      tab: tab.name,
      titleCol,
      keyCol: titleCol,
      subtitleCol: pickSubtitleCol(tab.headers, titleCol),
      allowAdds: true,
      allowUpdates: true,
      statusCol,
      phoneCol: pickNamed(tab.headers, /phone|mobile|whatsapp/i),
      imageCol: pickNamed(tab.headers, /photo|image|picture|img|^logo$/i),
      ownerCol: pickNamed(tab.headers, /^(owner|assigned|staff|who)$/i),
      cols: tab.headers,
      sliceCols: [titleCol],
      nav: defaultNavForTab(tab.name),
      collectionStyle: "list",
      allowDelete: true,
      addFields: fields,
      editFields: fields,
    };
  });

  const related = inferRelations(workbook, views);
  for (const view of views) {
    const isChild = related.some((rel) => rel.childTab === view.tab);
    const isParent = related.some((rel) => rel.parentViewId === view.id);
    if (isChild && !isParent && LINE_TAB.test(view.tab)) {
      view.nav = false;
    }
  }

  const name = appName || workbook.title || "My app";
  return {
    meta: {
      name,
      version: 1,
      plan: "free",
      themeAccent: "#111113",
      requirePin: true,
      showFormBanner: false,
    },
    hubs: ["App"],
    views,
    related,
    computed: tabs.flatMap((tab) => defaultComputedForTab(tab.name, tab.headers)),
    users: [
      { id: "owner", name: "Owner", pin: "1234", role: "owner" },
      { id: "manager", name: "Manager", pin: "1111", role: "manager" },
      { id: "staff", name: "User", pin: "0000", role: "user" },
    ],
  };
}
