import { describe, expect, it } from "vitest";
import { matchPartForRepair } from "@/lib/mobile-shop/match-part";
import { formatPromisedAt, parsePromisedAt } from "@/lib/mobile-shop/promised-at";

const parts = [
  { id: "a", name: "Redmi 13 Screen", qty: 2 },
  { id: "b", name: "Screen", qty: 4 },
  { id: "c", name: "A15 battery", qty: 1 },
  { id: "d", name: "Charging port flex", qty: 3 },
  { id: "e", name: "Zero stock screen", qty: 0 },
];

describe("matchPartForRepair", () => {
  it("prefers device + jobType over exact jobType", () => {
    expect(matchPartForRepair(parts, "Redmi 13", "Screen")?.id).toBe("a");
  });

  it("falls back to exact jobType", () => {
    expect(matchPartForRepair(parts, "Pixel 8", "Screen")?.id).toBe("b");
  });

  it("falls back to name including jobType", () => {
    expect(matchPartForRepair(parts, "Samsung A15", "Battery")?.id).toBe("c");
    expect(matchPartForRepair(parts, "Any", "Charging port")?.id).toBe("d");
  });

  it("skips qty 0 and does not match Other via includes", () => {
    expect(matchPartForRepair(parts, "Redmi 13", "Other")).toBeNull();
    expect(
      matchPartForRepair([{ id: "e", name: "Zero stock screen", qty: 0 }], "X", "Screen"),
    ).toBeNull();
  });
});

describe("parsePromisedAt", () => {
  it("parses YYYY-MM-DD as UTC noon and rejects junk", () => {
    const parsed = parsePromisedAt("2026-09-10");
    expect(parsed).toBeInstanceOf(Date);
    expect(formatPromisedAt(parsed as Date)).toBe("2026-09-10");
    expect(parsePromisedAt("")).toBeNull();
    expect(parsePromisedAt("not-a-date")).toBe("invalid");
  });
});
