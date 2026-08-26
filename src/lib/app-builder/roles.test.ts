import { describe, expect, it } from "vitest";
import { appsheetUserRole, canSeeAllRows, isAppAdmin, parseAppRole, roleLabel } from "./roles";

describe("AppSheet roles", () => {
  it("maps Owner and Admin to USERROLE Admin", () => {
    expect(appsheetUserRole("owner")).toBe("Admin");
    expect(appsheetUserRole("admin")).toBe("Admin");
    expect(appsheetUserRole("manager")).toBe("Manager");
    expect(appsheetUserRole("user")).toBe("User");
    expect(appsheetUserRole("staff")).toBe("User");
  });

  it("treats old staff as User and keeps saved roles", () => {
    expect(parseAppRole("staff")).toBe("staff");
    expect(parseAppRole("manager")).toBe("manager");
    expect(parseAppRole("unknown")).toBe("user");
    expect(roleLabel("staff")).toBe("User");
    expect(isAppAdmin("admin")).toBe(true);
    expect(isAppAdmin("manager")).toBe(false);
    expect(canSeeAllRows("manager")).toBe(true);
    expect(canSeeAllRows("user")).toBe(false);
  });
});
