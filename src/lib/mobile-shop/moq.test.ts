import { describe, expect, it } from "vitest";
import {
  effectiveMoq,
  isBelowMoq,
  parseMoqInput,
  shouldAlertOnDecrement,
} from "@/lib/mobile-shop/moq";

describe("effectiveMoq", () => {
  it("uses the set reorder level, else 2 for qty items and 0 for phones", () => {
    expect(effectiveMoq(5, "ACCESSORY")).toBe(5);
    expect(effectiveMoq(0, "ACCESSORY")).toBe(2);
    expect(effectiveMoq(0, "PART")).toBe(2);
    expect(effectiveMoq(0, "PHONE")).toBe(0);
    expect(effectiveMoq(3, "PHONE")).toBe(3);
  });
});

describe("isBelowMoq", () => {
  it("flags accessories at or below MOQ, including the fallback of 2", () => {
    expect(isBelowMoq(2, 0, "ACCESSORY")).toBe(true);
    expect(isBelowMoq(3, 0, "ACCESSORY")).toBe(false);
    expect(isBelowMoq(5, 6, "ACCESSORY")).toBe(true);
    expect(isBelowMoq(1, 0, "PHONE")).toBe(false);
  });
});

describe("shouldAlertOnDecrement", () => {
  it("fires once when qty hits or crosses below MOQ", () => {
    expect(shouldAlertOnDecrement(5, 2, 2, "ACCESSORY")).toBe(true);
    expect(shouldAlertOnDecrement(3, 2, 2, "ACCESSORY")).toBe(true);
    expect(shouldAlertOnDecrement(2, 1, 2, "ACCESSORY")).toBe(false);
    expect(shouldAlertOnDecrement(1, 0, 0, "PHONE")).toBe(false);
  });
});

describe("parseMoqInput", () => {
  it("accepts 0 or more and rejects junk", () => {
    expect(parseMoqInput("4")).toBe(4);
    expect(parseMoqInput("0")).toBe(0);
    expect(parseMoqInput("")).toBeNull();
    expect(parseMoqInput("-1")).toBeNull();
  });
});
