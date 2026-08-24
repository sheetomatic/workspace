import { describe, expect, it } from "vitest";
import {
  pickRowIdColumn,
  refColumnName,
  suggestMissingLinks,
} from "./schema";

describe("schema helpers", () => {
  it("picks a row id column", () => {
    expect(pickRowIdColumn(["Name", "Customer Id", "City"])).toBe("Customer Id");
    expect(pickRowIdColumn(["Code", "Name"])).toBe("Code");
    expect(pickRowIdColumn(["Title"])).toBe("Title");
  });

  it("names the child ref after the parent table", () => {
    expect(refColumnName("Customers")).toBe("ref_customer");
    expect(refColumnName("Sales")).toBe("ref_sale");
  });

  it("asks for parent-child links that Excel may not have", () => {
    const links = suggestMissingLinks(
      ["Customers", "Sales", "Payments", "HowTo"],
      [],
    );
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentTab: "Customers",
          childTab: "Sales",
        }),
        expect.objectContaining({
          parentTab: "Sales",
          childTab: "Payments",
        }),
      ]),
    );
    expect(links.some((link) => link.childTab === "HowTo")).toBe(false);
  });

  it("skips a link that already exists", () => {
    const links = suggestMissingLinks(
      ["Customers", "Sales"],
      [{ parentTab: "Customers", childTab: "Sales" }],
    );
    expect(links).toEqual([]);
  });
});
