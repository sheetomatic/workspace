import { evaluateAppSheetFormula } from "./appsheet-formula";
import type {
  AppAction,
  AppComputedColumn,
  AppConfig,
  AppVisibility,
  CellValue,
  SheetRow,
  UserRole,
} from "./index";
import {
  cellStr,
  filterRelated,
  navViews,
  normKey,
  parentKeyFromRow,
} from "./index";

type RowSource = { listRows: (tab: string) => SheetRow[] };

export function isImageUrl(value: string) {
  const text = value.trim();
  if (!/^https?:\/\//i.test(text)) return false;
  return (
    /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(text) ||
    /googleusercontent|lh3\.google|drive\.google\.com/i.test(text)
  );
}

function num(value: CellValue) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function interpolate(value: string, who: string | null) {
  return value
    .replaceAll("{{now}}", new Date().toLocaleDateString("en-GB"))
    .replaceAll("{{user}}", who || "Owner");
}

export function evaluateComputed(
  column: AppComputedColumn,
  row: SheetRow,
  config: AppConfig,
  sheet: RowSource,
): CellValue {
  if (column.kind === "math") {
    const left = num(row.cells[column.leftCol || ""]);
    const right = num(row.cells[column.rightCol || ""]);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return "";
    if (column.op === "add") return left + right;
    if (column.op === "sub") return left - right;
    if (column.op === "div") return right === 0 ? "" : Math.round((left / right) * 100) / 100;
    return Math.round(left * right * 100) / 100;
  }

  if (column.kind === "formula") {
    const tables: Record<string, SheetRow[]> = {};
    for (const view of config.views) {
      tables[view.tab] = sheet.listRows(view.tab);
    }
    return evaluateAppSheetFormula(column.formula || "", {
      row: row.cells,
      tables,
    });
  }

  if (column.kind === "if") {
    const actual = cellStr(row, column.whenCol || "");
    const want = column.whenValue ?? "";
    let pass = false;
    if (column.whenOp === "empty") pass = actual === "";
    else if (column.whenOp === "notempty") pass = actual !== "";
    else if (column.whenOp === "neq") pass = actual !== want;
    else pass = actual === want;
    return pass ? column.thenValue ?? "" : column.elseValue ?? "";
  }

  const rel = config.related.find((item) => item.id === column.relationId);
  if (!rel) return "";
  const parentView = config.views.find((view) => view.id === rel.parentViewId);
  if (column.tab === rel.childTab && parentView) {
    const want = normKey(parentKeyFromRow(row, rel.childKeys));
    if (!want) return "";
    const parent = sheet.listRows(parentView.tab).find((item) =>
      rel.parentKeys.some((key) => normKey(item.cells[key]) === want),
    );
    return parent?.cells[column.lookupCol || ""] ?? "";
  }
  const key = parentKeyFromRow(row, rel.parentKeys);
  const child = filterRelated(sheet.listRows(rel.childTab), rel.childKeys, key)[0];
  if (!child) return "";
  return child.cells[column.lookupCol || ""] ?? "";
}

export function enrichRow(
  row: SheetRow,
  tab: string,
  config: AppConfig,
  sheet: RowSource,
): SheetRow {
  const computed = (config.computed || []).filter((col) => col.tab === tab);
  if (!computed.length) return row;
  const cells = { ...row.cells };
  for (const column of computed) {
    cells[column.name] = evaluateComputed(column, { ...row, cells }, config, sheet);
  }
  return { ...row, cells };
}

export function visibilityAllows(
  rule: AppVisibility | undefined,
  role: UserRole | null,
  row?: SheetRow | null,
) {
  if (!rule || rule.when === "always") return true;
  if (rule.when === "never") return false;
  if (rule.when === "owner") return role === "owner";
  if (rule.when === "staff") return role === "staff" || role === "owner";
  if (!row || !rule.col) return true;
  return cellStr(row, rule.col) === (rule.equals ?? "");
}

export function ruleFor(
  config: AppConfig,
  target: AppVisibility["target"],
  targetId: string,
) {
  return (config.visibility || []).find(
    (rule) => rule.target === target && rule.targetId === targetId,
  );
}

export function visibleNavViews(config: AppConfig, role: UserRole | null) {
  return navViews(config).filter((view) =>
    visibilityAllows(ruleFor(config, "view", view.id), role),
  );
}

export function visibleFields(keys: string[], config: AppConfig, role: UserRole | null, row: SheetRow) {
  return keys.filter((key) => visibilityAllows(ruleFor(config, "field", key), role, row));
}

export function visibleActions(
  config: AppConfig,
  viewId: string,
  role: UserRole | null,
  row: SheetRow,
) {
  return (config.actions || []).filter(
    (action) =>
      action.viewId === viewId &&
      visibilityAllows(ruleFor(config, "action", action.id), role, row),
  );
}

export function applyAction(
  action: AppAction,
  row: SheetRow,
  who: string | null,
): { cells: Record<string, CellValue>; notify?: string; go?: "home" | "collection" | "detail" } {
  const cells: Record<string, CellValue> = {};
  let notify: string | undefined;
  let go: "home" | "collection" | "detail" | undefined;
  for (const step of action.steps) {
    if (step.kind === "set" && step.col) {
      cells[step.col] = interpolate(step.value ?? "", who);
    }
    if (step.kind === "notify") {
      notify = interpolate(step.message || action.label, who);
    }
    if (step.kind === "go") {
      go = step.screen || "collection";
    }
  }
  return { cells, notify, go };
}

export function defaultComputedForTab(tab: string, headers: string[]): AppComputedColumn[] {
  const qty = headers.find((h) => /^(qty|quantity)$/i.test(h));
  const rate = headers.find((h) => /^(rate|price)$/i.test(h));
  const amount = headers.find((h) => /line amount|amount|total/i.test(h));
  if (!qty || !rate || amount) return [];
  return [
    {
      id: `${tab}-line-amount`,
      tab,
      name: "Line Amount",
      kind: "math",
      leftCol: qty,
      op: "mul",
      rightCol: rate,
    },
  ];
}
