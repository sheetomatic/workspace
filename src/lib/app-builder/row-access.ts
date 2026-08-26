import type { AppUser, CellValue, SheetRow } from "./index";
import { canSeeAllRows } from "./roles";

function key(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Values that identify a person for row-owner matching. */
export function ownerKeysForUser(user: Pick<AppUser, "name" | "email" | "phone">): string[] {
  return [user.name, user.email, user.phone].map((value) => key(value)).filter(Boolean);
}

export function ownerValueMatchesUser(
  value: CellValue,
  user: Pick<AppUser, "name" | "email" | "phone">,
): boolean {
  const want = key(value);
  if (!want) return false;
  return ownerKeysForUser(user).includes(want);
}

/** Owner, Admin, and Manager see every row. Users see only rows they own. */
export function rowVisibleToUser(
  row: SheetRow,
  ownerCol: string | undefined,
  user: AppUser | undefined,
): boolean {
  if (!ownerCol || !user || canSeeAllRows(user.role)) return true;
  return ownerValueMatchesUser(row.cells[ownerCol], user);
}
