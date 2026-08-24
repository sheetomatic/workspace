/** Shared types + view helpers for Sheetomatic App Builder. */

export type ViewKind = "deck" | "detail" | "form" | "dashboard" | "menu";
export type CollectionStyle = "list" | "cards" | "table" | "kanban";
export type UserRole = "owner" | "staff";

export interface AppMeta {
  name: string;
  themeAccent?: string;
  themeId?: string;
  version: number;
  plan?: "free" | "paid";
  requirePin?: boolean;
  formTitle?: string;
  brand?: string;
  greeting?: string;
  showBrand?: boolean;
  showFormBanner?: boolean;
  showSearch?: boolean;
  showHomeTiles?: boolean;
  showRecent?: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  phone?: string;
  pin: string;
  role: UserRole;
}

export type FieldType = "text" | "number" | "date" | "phone" | "email" | "choice" | "image";

export type ComputedKind = "lookup" | "math" | "if";
export type MathOp = "mul" | "add" | "sub" | "div";
export type IfOp = "eq" | "neq" | "empty" | "notempty";
export type VisibilityWhen = "always" | "never" | "owner" | "staff" | "column";
export type ActionStepKind = "set" | "notify" | "go";

export interface AppComputedColumn {
  id: string;
  tab: string;
  name: string;
  kind: ComputedKind;
  relationId?: string;
  lookupCol?: string;
  leftCol?: string;
  op?: MathOp;
  rightCol?: string;
  whenCol?: string;
  whenOp?: IfOp;
  whenValue?: string;
  thenValue?: string;
  elseValue?: string;
}

export interface AppVisibility {
  id: string;
  target: "view" | "field" | "action";
  targetId: string;
  when: VisibilityWhen;
  col?: string;
  equals?: string;
}

export interface AppActionStep {
  kind: ActionStepKind;
  col?: string;
  value?: string;
  message?: string;
  screen?: "home" | "collection" | "detail";
}

export interface AppAction {
  id: string;
  label: string;
  viewId: string;
  steps: AppActionStep[];
}

export interface AppFormField {
  name: string;
  label: string;
  col: string;
  type?: FieldType;
  required?: boolean;
  options?: string[];
  choiceTab?: string;
  choiceCol?: string;
}

export interface AppView {
  id: string;
  hub: string;
  name: string;
  kind: ViewKind;
  tab: string;
  titleCol?: string;
  subtitleCol?: string;
  cols: string[];
  sliceCols?: string[];
  /** Hide from bottom tabs — show only as a related collection. */
  nav?: boolean;
  collectionStyle?: CollectionStyle;
  statusCol?: string;
  phoneCol?: string;
  imageCol?: string;
  ownerCol?: string;
  allowDelete?: boolean;
  addFields?: AppFormField[];
  editFields?: AppFormField[];
}

export interface AppRelated {
  id: string;
  name: string;
  parentViewId: string;
  childTab: string;
  childViewId?: string;
  parentKeys: string[];
  childKeys: string[];
  cols: string[];
  addFields?: AppFormField[];
}

export interface AppConfig {
  meta: AppMeta;
  hubs: string[];
  views: AppView[];
  related: AppRelated[];
  users?: AppUser[];
  computed?: AppComputedColumn[];
  visibility?: AppVisibility[];
  actions?: AppAction[];
}

export type CellValue = string | number | boolean | null;

export interface SheetRow {
  _row: number;
  cells: Record<string, CellValue>;
}

export interface SheetTab {
  name: string;
  headers: string[];
  rows: SheetRow[];
}

export interface SheetWorkbook {
  title: string;
  tabs: Record<string, SheetTab>;
}

export function createEmptyConfig(name = "Untitled app"): AppConfig {
  return {
    meta: {
      name,
      version: 1,
      plan: "free",
      themeAccent: "#111113",
      requirePin: false,
      showFormBanner: false,
      formTitle: "New record",
    },
    hubs: [],
    views: [],
    related: [],
    users: [{ id: "owner", name: "Owner", pin: "1234", role: "owner" }],
  };
}

export function normKey(s: unknown): string {
  return String(s ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function cellStr(row: SheetRow, col: string): string {
  const v = row.cells[col];
  if (v == null) return "";
  return String(v).trim();
}

/** AppSheet-style slice: row must have at least one of sliceCols filled. */
export function applySlice(rows: SheetRow[], sliceCols?: string[]): SheetRow[] {
  if (!sliceCols?.length) return rows;
  return rows.filter((row) => sliceCols.some((c) => cellStr(row, c) !== ""));
}

export function searchRows(rows: SheetRow[], q: string): SheetRow[] {
  const needle = normKey(q);
  if (!needle) return rows;
  return rows.filter((row) =>
    Object.values(row.cells).some((v) => normKey(v).includes(needle)),
  );
}

/** Related / Ref: match parent key onto child foreign keys. */
export function filterRelated(
  childRows: SheetRow[],
  childKeys: string[],
  parentKey: string,
): SheetRow[] {
  const want = normKey(parentKey);
  if (!want) return [];
  return childRows.filter((row) =>
    childKeys.some((k) => normKey(row.cells[k]) === want),
  );
}

export function parentKeyFromRow(row: SheetRow, parentKeys: string[]): string {
  for (const k of parentKeys) {
    const v = cellStr(row, k);
    if (v) return v;
  }
  return "";
}

export function hubsFromViews(views: AppView[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of views) {
    if (!seen.has(v.hub)) {
      seen.add(v.hub);
      out.push(v.hub);
    }
  }
  return out;
}

export function viewsForHub(config: AppConfig, hub: string): AppView[] {
  return config.views.filter((v) => v.hub === hub);
}

export function relatedForView(config: AppConfig, viewId: string): AppRelated[] {
  return config.related.filter((r) => r.parentViewId === viewId);
}

export function navViews(config: AppConfig): AppView[] {
  return config.views.filter((v) => v.nav !== false);
}

export function addButtonLabel(
  view?: { name: string } | null,
  formTitle?: string,
) {
  const titled = formTitle?.trim();
  if (titled) return titled;
  const name = view?.name?.trim() || "item";
  const one = /ies$/i.test(name)
    ? name.replace(/ies$/i, "y")
    : /s$/i.test(name)
      ? name.replace(/s$/i, "")
      : name;
  return `New ${one}`;
}

export function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function tone(value: string): string {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = value.charCodeAt(i) + ((h << 5) - h);
  return `hsl(${Math.abs(h) % 360} 42% 42%)`;
}

/** Demo: Orders app — enough to sell the Glide/AppSheet desk model locally. */
export function createDemoConfig(): AppConfig {
  return {
    meta: {
      name: "Orders Desk",
      version: 1,
      plan: "free",
      themeAccent: "#163a7a",
    },
    hubs: ["Sales", "Master"],
    views: [
      {
        id: "orders",
        hub: "Sales",
        name: "Orders",
        kind: "deck",
        tab: "Orders",
        titleCol: "Order No",
        subtitleCol: "Party",
        collectionStyle: "list",
        cols: ["Order No", "Date", "Party", "Status", "Amount", "Party Phone"],
        sliceCols: ["Order No"],
        statusCol: "Status",
        addFields: [
          { name: "orderNo", label: "Order No", col: "Order No", required: true },
          { name: "party", label: "Party", col: "Party", required: true },
          { name: "date", label: "Date", col: "Date", type: "date" },
          { name: "amount", label: "Amount", col: "Amount", type: "number" },
        ],
        editFields: [
          { name: "party", label: "Party", col: "Party", required: true },
          { name: "status", label: "Status", col: "Status", required: true },
          { name: "amount", label: "Amount", col: "Amount", type: "number" },
        ],
      },
      {
        id: "order-lines",
        hub: "Sales",
        name: "Order Lines",
        kind: "deck",
        tab: "Order Lines",
        titleCol: "Item",
        subtitleCol: "Order No",
        nav: false,
        collectionStyle: "list",
        cols: ["Order No", "Item", "Qty", "Rate", "Line Amount"],
        sliceCols: ["Order No", "Item"],
        addFields: [
          { name: "orderNo", label: "Order No", col: "Order No", required: true },
          { name: "item", label: "Item", col: "Item", required: true },
          { name: "qty", label: "Qty", col: "Qty", type: "number", required: true },
          { name: "rate", label: "Rate", col: "Rate", type: "number" },
        ],
      },
      {
        id: "parties",
        hub: "Master",
        name: "Parties",
        kind: "deck",
        tab: "Parties",
        titleCol: "Party Name",
        subtitleCol: "City",
        collectionStyle: "list",
        cols: ["Party Name", "Phone", "City"],
        sliceCols: ["Party Name"],
        addFields: [
          { name: "name", label: "Party Name", col: "Party Name", required: true },
          { name: "phone", label: "Phone", col: "Phone" },
          { name: "city", label: "City", col: "City" },
        ],
      },
      {
        id: "items",
        hub: "Master",
        name: "Items",
        kind: "deck",
        tab: "Items",
        titleCol: "Item",
        subtitleCol: "Unit",
        collectionStyle: "cards",
        cols: ["Item", "Unit", "Rate"],
        sliceCols: ["Item"],
        addFields: [
          { name: "item", label: "Item", col: "Item", required: true },
          { name: "unit", label: "Unit", col: "Unit" },
          { name: "rate", label: "Rate", col: "Rate", type: "number" },
        ],
      },
    ],
    related: [
      {
        id: "order-lines-rel",
        name: "Order lines",
        parentViewId: "orders",
        childTab: "Order Lines",
        parentKeys: ["Order No"],
        childKeys: ["Order No"],
        cols: ["Item", "Qty", "Rate", "Line Amount"],
        addFields: [
          { name: "item", label: "Item", col: "Item", required: true },
          { name: "qty", label: "Qty", col: "Qty", type: "number", required: true },
          { name: "rate", label: "Rate", col: "Rate", type: "number" },
        ],
      },
      {
        id: "party-orders-rel",
        name: "Orders",
        parentViewId: "parties",
        childTab: "Orders",
        parentKeys: ["Party Name"],
        childKeys: ["Party"],
        cols: ["Order No", "Date", "Status", "Amount"],
      },
    ],
    computed: [
      {
        id: "party-phone",
        tab: "Orders",
        name: "Party Phone",
        kind: "lookup",
        relationId: "party-orders-rel",
        lookupCol: "Phone",
      },
    ],
    actions: [
      {
        id: "mark-done",
        label: "Mark done",
        viewId: "orders",
        steps: [
          { kind: "set", col: "Status", value: "Done" },
          { kind: "notify", message: "Marked done" },
        ],
      },
    ],
  };
}

export { TEMPLATES, styleLabel, type AppPlan } from "./templates";
export { THEMES, themeById, themeVars, type ThemePalette } from "./themes";
export { inferAppFromWorkbook, inferFieldType } from "./infer";
export {
  parseGoogleSheetId,
  SPREADSHEET_ACCEPT,
  workbookFromSpreadsheetFile,
} from "./workbook-file";
export {
  applyAction,
  enrichRow,
  evaluateComputed,
  isImageUrl,
  visibleActions,
  visibleFields,
  visibleNavViews,
} from "./glide-extras";
