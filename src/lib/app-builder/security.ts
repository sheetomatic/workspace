import { navViews, type AppConfig, type AppUser, type AppView, type CellValue, type SheetRow } from "./index";
import { evaluateAppSheetFormula } from "./appsheet-formula";
import { ruleFor, visibilityAllows } from "./glide-extras";
import { appsheetUserRole, isAppAdmin, normalizeAppRole } from "./roles";
import { rowVisibleToUser } from "./row-access";

function normEmail(value: string | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function domainOf(email: string) {
  const at = email.lastIndexOf("@");
  return at > 0 ? email.slice(at + 1) : "";
}

export function emailAllowed(
  email: string | undefined,
  meta: Pick<AppConfig["meta"], "allowedEmails" | "allowedDomain">,
  role?: AppUser["role"],
): boolean {
  if (isAppAdmin(role)) return true;
  const list = (meta.allowedEmails || []).map(normEmail).filter(Boolean);
  const domain = String(meta.allowedDomain ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  if (!list.length && !domain) return true;
  const want = normEmail(email);
  if (!want) return false;
  if (list.includes(want)) return true;
  if (domain && domainOf(want) === domain) return true;
  return false;
}

export function userMaySignIn(
  user: AppUser | undefined,
  meta: AppConfig["meta"],
): { ok: boolean; reason?: string } {
  if (!user) return { ok: false, reason: "PIN does not match anyone." };
  if (user.disabled) return { ok: false, reason: "This person is turned off." };
  if (!emailAllowed(user.email, meta, user.role)) {
    return { ok: false, reason: "This email is not allowed to open the app." };
  }
  return { ok: true };
}

export function userCanOpenView(user: AppUser | undefined, view: AppView): boolean {
  if (!user || isAppAdmin(user.role)) return true;
  if (user.tables == null) return true;
  return user.tables.includes(view.tab) || user.tables.includes(view.id);
}

export function viewsForUser(config: AppConfig, user: AppUser | undefined) {
  return navViews(config)
    .filter((view) => visibilityAllows(ruleFor(config, "view", view.id), user?.role ?? null))
    .filter((view) => userCanOpenView(user, view));
}

export type MutateKind = "adds" | "updates" | "deletes";

export function userCanMutate(
  user: AppUser | undefined,
  view: AppView | null | undefined,
  kind: MutateKind,
): boolean {
  if (!view) return false;
  const tableOk =
    kind === "adds"
      ? view.allowAdds !== false
      : kind === "updates"
        ? view.allowUpdates !== false
        : view.allowDelete !== false;
  if (!tableOk) return false;
  if (!user || isAppAdmin(user.role)) return true;
  const role = normalizeAppRole(user.role);
  if (role === "manager") {
    if (kind === "deletes") return user.allowDeletes === true;
    if (kind === "adds") return user.allowAdds !== false;
    return user.allowUpdates !== false;
  }
  if (kind === "adds") return user.allowAdds !== false;
  if (kind === "updates") return user.allowUpdates !== false;
  return user.allowDeletes !== false;
}

function formulaTruthy(value: CellValue) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!text || text === "false" || text === "0") return false;
  return true;
}

export function rowPassesSecurity(
  row: SheetRow,
  view: Pick<AppView, "ownerCol" | "securityFilter">,
  user: AppUser | undefined,
): boolean {
  if (!rowVisibleToUser(row, view.ownerCol, user)) return false;
  const filter = view.securityFilter?.trim();
  if (!filter) return true;
  const result = evaluateAppSheetFormula(filter, {
    row: row.cells,
    user: user?.email || user?.name || "Owner",
    userEmail: user?.email || "",
    userName: user?.name || "",
    userRole: appsheetUserRole(user?.role),
  });
  return formulaTruthy(result);
}

export function rowsForUser(
  rows: SheetRow[],
  view: Pick<AppView, "ownerCol" | "securityFilter">,
  user: AppUser | undefined,
): SheetRow[] {
  return rows.filter((row) => rowPassesSecurity(row, view, user));
}
