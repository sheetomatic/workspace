import { describe, expect, it } from "vitest";
import { leadMatchesSearchQuery, leadSearchWhere, phoneSearchDigits } from "@/lib/leads/search";

describe("formatted phone search", () => {
  it("handles partial digits and Indian prefixes without changing stored values", () => {
    for (const value of ["+91 98765-43210", "0091 (98765) 43210", "09876543210"]) {
      expect(phoneSearchDigits(value)).toBe("9876543210");
      expect(leadMatchesSearchQuery({ phone: "9876543210" }, value)).toBe(true);
    }
    expect(leadMatchesSearchQuery({ phone: "+91 908 123 4567" }, "908")).toBe(true);
    expect(leadSearchWhere("908").OR).toContainEqual({phone: {contains: "908"}});
  });
  it("does not silently truncate foreign numbers or turn mixed text into phone searches", () => {
    expect(phoneSearchDigits("+44 7911 123456")).toBe("447911123456");
    expect(phoneSearchDigits("order 1234")).toBe("");
  });
});

describe("leadSearchWhere", () => {
  it("returns empty filter when query is blank", () => {
    expect(leadSearchWhere("")).toEqual({});
    expect(leadSearchWhere("   ")).toEqual({});
  });

  it("searches name, phone, email, company, requirement, and category", () => {
    const where = leadSearchWhere("shyam");
    expect(where.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: "shyam", mode: "insensitive" } },
        { phone: { contains: "shyam", mode: "insensitive" } },
        { email: { contains: "shyam", mode: "insensitive" } },
        { company: { contains: "shyam", mode: "insensitive" } },
      ]),
    );
  });

  it("also matches phone by last digits when the query looks like a number", () => {
    const where = leadSearchWhere("9876543210");
    expect(where.OR).toEqual(
      expect.arrayContaining([{ phone: { contains: "9876543210" } }]),
    );
  });
});

describe("leadMatchesSearchQuery", () => {
  it("matches sheet rows by name or last 10 phone digits", () => {
    expect(
      leadMatchesSearchQuery(
        { name: "Shyam Kumar", phone: "+91 99988 82365" },
        "shyam",
      ),
    ).toBe(true);
    expect(
      leadMatchesSearchQuery({ name: "Ravi", phone: "919876543210" }, "9876543210"),
    ).toBe(true);
    expect(
      leadMatchesSearchQuery({ name: "Ravi", phone: "919876543210" }, "shyam"),
    ).toBe(false);
    expect(
      leadMatchesSearchQuery(
        { name: "Neha", email: "neha@studio.in", phone: "919811112222" },
        "neha@studio.in",
      ),
    ).toBe(true);
  });
});
