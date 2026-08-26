import type { AppUser, CellValue, SheetRow } from "./index";

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

/** Owners see every row. Staff see only rows they own when ownerCol is set. */
export function rowVisibleToUser(
  row: SheetRow,
  ownerCol: string | undefined,
  user: AppUser | undefined,
): boolean {
  if (!ownerCol || !user || user.role === "owner") return true;
  return ownerValueMatchesUser(row.cells[ownerCol], user);
}
