import { describe, expect, it } from "vitest";
import {
  isBadStoredCustomerName,
  isCityOnlyName,
  isPhoneLikeName,
  safeCustomerDisplayName,
  safeCustomerFirstName,
} from "@/lib/wa-safe-customer-name";

describe("wa-safe-customer-name", () => {
  it("rejects phone-like and city-only names", () => {
    expect(isPhoneLikeName("+91 93291 03106")).toBe(true);
    expect(isCityOnlyName("Nashik")).toBe(true);
    expect(isCityOnlyName("Delhi")).toBe(true);
    expect(safeCustomerDisplayName("Nashik")).toBeNull();
    expect(safeCustomerDisplayName("Priya Sharma")).toBe("Priya Sharma");
    expect(safeCustomerFirstName("Nashik")).toBeNull();
    expect(safeCustomerFirstName("Priya Sharma")).toBe("Priya");
  });

  it("flags bad stored names for cleanup", () => {
    expect(isBadStoredCustomerName("+919329103106")).toBe(true);
    expect(isBadStoredCustomerName("Mumbai")).toBe(true);
    expect(isBadStoredCustomerName("Rahul")).toBe(false);
  });
});
