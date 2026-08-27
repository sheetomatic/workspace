export type AppRole = "owner" | "admin" | "manager" | "user";
export type StoredRole = AppRole | "staff";

export const APP_ROLES: {
  id: AppRole;
  label: string;
  userRole: "Admin" | "Manager" | "User";
  hint: string;
}[] = [
  { id: "owner", label: "Owner", userRole: "Admin", hint: "Every row. Every screen. Add, edit, delete." },
  { id: "admin", label: "Admin", userRole: "Admin", hint: "Same as owner — runs the app." },
  { id: "manager", label: "Manager", userRole: "Manager", hint: "Every row. Add and edit. Delete only if you allow it." },
  { id: "user", label: "User", userRole: "User", hint: "Own rows. What you allow on this person." },
];

export function parseAppRole(value: unknown): StoredRole {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (text === "owner" || text === "admin" || text === "manager" || text === "user") return text;
  if (text === "staff") return "staff";
  return "user";
}

export function normalizeAppRole(role: string | null | undefined): AppRole {
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  if (role === "manager") return "manager";
  return "user";
}

export function isAppAdmin(role: string | null | undefined): boolean {
  const n = normalizeAppRole(role);
  return n === "owner" || n === "admin";
}

/** Owner, Admin, and Manager see every row. Users see their own. */
export function canSeeAllRows(role: string | null | undefined): boolean {
  const n = normalizeAppRole(role);
  return n === "owner" || n === "admin" || n === "manager";
}

/** AppSheet USERROLE() — Admin, Manager, or User. */
export function appsheetUserRole(role: string | null | undefined): "Admin" | "Manager" | "User" {
  const n = normalizeAppRole(role);
  if (n === "owner" || n === "admin") return "Admin";
  if (n === "manager") return "Manager";
  return "User";
}

export function roleLabel(role: string | null | undefined): string {
  const parsed = parseAppRole(role);
  if (parsed === "owner") return "Owner";
  if (parsed === "admin") return "Admin";
  if (parsed === "manager") return "Manager";
  return "User";
}
