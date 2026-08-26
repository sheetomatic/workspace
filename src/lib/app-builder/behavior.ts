import type {
  AppAction,
  AppConfig,
  AppFormField,
  AppSlice,
  AppUser,
  AppView,
  CellValue,
  FieldFormat,
  FieldType,
  SheetRow,
} from "./index";
import { evaluateAppSheetFormula } from "./appsheet-formula";
import { appsheetUserRole } from "./roles";

function formulaCtx(row: Record<string, CellValue>, user?: AppUser) {
  return {
    row,
    user: user?.email || user?.name || "Owner",
    userEmail: user?.email || "",
    userName: user?.name || "",
    userRole: appsheetUserRole(user?.role),
  };
}

function truthy(value: CellValue) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!text || text === "false" || text === "0") return false;
  return true;
}

export function formulaTrue(
  formula: string | undefined,
  row: Record<string, CellValue>,
  user?: AppUser,
  whenEmpty = true,
): boolean {
  const text = formula?.trim();
  if (!text) return whenEmpty;
  return truthy(evaluateAppSheetFormula(text, formulaCtx(row, user)));
}

export function fieldShown(field: AppFormField | undefined, row: Record<string, CellValue>, user?: AppUser) {
  return formulaTrue(field?.showIf, row, user, true);
}

export function fieldEditable(field: AppFormField | undefined, row: Record<string, CellValue>, user?: AppUser) {
  if (field?.virtual) return false;
  return formulaTrue(field?.editIf, row, user, true);
}

export function fieldRequired(field: AppFormField | undefined, row: Record<string, CellValue>, user?: AppUser) {
  if (field?.requiredIf?.trim()) return formulaTrue(field.requiredIf, row, user, false);
  return !!field?.required;
}

export function fieldValid(
  field: AppFormField | undefined,
  value: CellValue,
  row: Record<string, CellValue>,
  user?: AppUser,
): { ok: boolean; message?: string } {
  if (!field?.validIf?.trim()) return { ok: true };
  const next = { ...row, [field.col]: value };
  if (formulaTrue(field.validIf, next, user, true)) return { ok: true };
  return { ok: false, message: field.invalidMessage || `${field.label} is not valid` };
}

export function actionShown(action: AppAction, row: Record<string, CellValue>, user?: AppUser) {
  if (action.position === "hide") return false;
  return formulaTrue(action.onlyIf, row, user, true);
}

export function sliceOf(config: AppConfig, view?: AppView): AppSlice | undefined {
  if (!view?.sliceId) return undefined;
  return (config.slices || []).find((slice) => slice.id === view.sliceId);
}

export function sliceAllows(slice: AppSlice | undefined, kind: "adds" | "updates" | "deletes") {
  if (!slice) return true;
  if (kind === "adds") return slice.allowAdds !== false;
  if (kind === "updates") return slice.allowUpdates !== false;
  return slice.allowDelete === true ? true : slice.allowDelete !== false;
}

export function applySliceFilter(
  rows: SheetRow[],
  view: AppView | undefined,
  config: AppConfig,
  user?: AppUser,
): SheetRow[] {
  const slice = sliceOf(config, view);
  const filter = slice?.filter || view?.sliceFilter;
  if (!filter?.trim()) return rows;
  return rows.filter((row) => formulaTrue(filter, row.cells, user));
}

export function formatCell(
  value: CellValue,
  format?: FieldFormat,
  type?: FieldType,
): string {
  if (value == null || value === "") return "";
  const kind = format?.kind || (type === "number" ? "number" : type === "date" ? "date" : "text");
  if (kind === "text") return String(value);
  if (kind === "date") {
    const raw = String(value);
    const parsed = Date.parse(raw.includes("/") ? raw.split("/").reverse().join("-") : raw);
    if (!Number.isFinite(parsed)) return raw;
    const style = format?.dateStyle || "short";
    return new Date(parsed).toLocaleDateString(
      "en-IN",
      style === "long"
        ? { day: "numeric", month: "long", year: "numeric" }
        : style === "medium"
          ? { day: "numeric", month: "short", year: "numeric" }
          : { day: "2-digit", month: "2-digit", year: "numeric" },
    );
  }
  const num = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  if (!Number.isFinite(num)) return String(value);
  const decimals = format?.decimals ?? (kind === "currency" ? 2 : 0);
  if (kind === "percent") {
    const pct = num <= 1 ? num * 100 : num;
    return `${pct.toFixed(decimals)}%`;
  }
  const body = num.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (kind === "currency") {
    const code = (format?.currency || "INR").toUpperCase();
    const mark = code === "USD" ? "$" : code === "EUR" ? "€" : "₹";
    return `${mark}${body}`;
  }
  return body;
}

export function displayField(view: AppView | undefined, col: string, value: CellValue) {
  const field =
    view?.addFields?.find((item) => item.col === col) ||
    view?.editFields?.find((item) => item.col === col);
  return formatCell(value, field?.format, field?.type);
}
