import { describe, expect, it } from "vitest";
import { ownerValueMatchesUser, rowVisibleToUser } from "./row-access";

const staff = { id: "s", name: "Asha", pin: "2222", role: "staff" as const, email: "asha@firm.com" };
const owner = { id: "o", name: "Owner", pin: "1234", role: "owner" as const };

describe("row access", () => {
  it("matches staff by name or email", () => {
    expect(ownerValueMatchesUser("Asha", staff)).toBe(true);
    expect(ownerValueMatchesUser("asha@firm.com", staff)).toBe(true);
    expect(ownerValueMatchesUser("Ravi", staff)).toBe(false);
  });

  it("hides other people's rows from staff when a row owner column is set", () => {
    const mine = { _row: 2, cells: { Owner: "Asha", Deal: "Quote" } };
    const theirs = { _row: 3, cells: { Owner: "Ravi", Deal: "Won" } };
    expect(rowVisibleToUser(mine, "Owner", staff)).toBe(true);
    expect(rowVisibleToUser(theirs, "Owner", staff)).toBe(false);
    expect(rowVisibleToUser(theirs, "Owner", owner)).toBe(true);
    expect(rowVisibleToUser(theirs, undefined, staff)).toBe(true);
  });
});
