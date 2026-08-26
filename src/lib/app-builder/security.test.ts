import { describe, expect, it } from "vitest";
import { createEmptyConfig } from "./index";
import {
  emailAllowed,
  rowPassesSecurity,
  userCanMutate,
  userCanOpenView,
  userMaySignIn,
} from "./security";

const staff = {
  id: "s",
  name: "Asha",
  pin: "2222",
  role: "staff" as const,
  email: "asha@firm.com",
};
const owner = { id: "o", name: "Owner", pin: "1234", role: "owner" as const };

describe("app security", () => {
  it("allows any email until an allow-list or domain is set", () => {
    expect(emailAllowed("anyone@x.com", {})).toBe(true);
    expect(emailAllowed("asha@firm.com", { allowedEmails: ["asha@firm.com"] })).toBe(true);
    expect(emailAllowed("ravi@other.com", { allowedEmails: ["asha@firm.com"] })).toBe(false);
    expect(emailAllowed("asha@firm.com", { allowedDomain: "firm.com" })).toBe(true);
    expect(emailAllowed("asha@other.com", { allowedDomain: "firm.com" })).toBe(false);
    expect(emailAllowed("guest@x.com", { allowedDomain: "firm.com" }, "owner")).toBe(true);
  });

  it("blocks disabled people and emails outside the allow-list", () => {
    expect(userMaySignIn(staff, { name: "App", version: 1 }).ok).toBe(true);
    expect(userMaySignIn({ ...staff, disabled: true }, { name: "App", version: 1 }).ok).toBe(
      false,
    );
    expect(
      userMaySignIn(staff, {
        name: "App",
        version: 1,
        allowedEmails: ["ravi@firm.com"],
      }).ok,
    ).toBe(false);
  });
});

describe("user security", () => {
  const view = {
    id: "leads",
    hub: "App",
    name: "Leads",
    kind: "deck" as const,
    tab: "Leads",
    cols: ["Name", "Email"],
    allowAdds: true,
    allowUpdates: true,
    allowDelete: true,
  };

  it("limits staff to listed tables and their own add/update/delete", () => {
    expect(userCanOpenView({ ...staff, tables: ["Leads"] }, view)).toBe(true);
    expect(userCanOpenView({ ...staff, tables: ["Orders"] }, view)).toBe(false);
    expect(userCanOpenView({ ...staff, tables: [] }, view)).toBe(false);
    expect(userCanOpenView(owner, { ...view, tab: "Orders" })).toBe(true);
    expect(userCanMutate({ ...staff, allowAdds: false }, view, "adds")).toBe(false);
    expect(userCanMutate(staff, { ...view, allowAdds: false }, "adds")).toBe(false);
    expect(userCanMutate(staff, view, "adds")).toBe(true);
    expect(userCanMutate({ ...staff, allowDeletes: false }, view, "deletes")).toBe(false);
  });

  it("applies a security filter like [Email]=USEREMAIL()", () => {
    const mine = { _row: 2, cells: { Email: "asha@firm.com", Deal: "Quote" } };
    const theirs = { _row: 3, cells: { Email: "ravi@firm.com", Deal: "Won" } };
    const filter = { securityFilter: "[Email]=USEREMAIL()" };
    expect(rowPassesSecurity(mine, filter, staff)).toBe(true);
    expect(rowPassesSecurity(theirs, filter, staff)).toBe(false);
    expect(
      rowPassesSecurity(theirs, filter, {
        ...owner,
        email: "owner@firm.com",
      }),
    ).toBe(false);
    expect(
      rowPassesSecurity(theirs, {
        securityFilter: 'OR(USERROLE()="Owner",[Email]=USEREMAIL())',
      }, owner),
    ).toBe(true);
  });
});

describe("empty app defaults", () => {
  it("asks for a PIN on new apps", () => {
    expect(createEmptyConfig("Desk").meta.requirePin).toBe(true);
  });
});
