import { describe, expect, it } from "vitest";
import { leadMatchesSearchQuery, leadSearchWhere } from "@/lib/leads/search";

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
