import { describe, expect, it } from "vitest";
import {
  normalizeRazorpayAmountInr,
  readRazorpayHandleConfig,
} from "./razorpay-me";
describe("Courses and template hosted checkout", () => {
  it("preserves GST paise and existing whole-rupee course amounts", () => {
    expect(normalizeRazorpayAmountInr(1177.64)).toBe(1177.64);
    expect(normalizeRazorpayAmountInr(1766.46)).toBe(1766.46);
    expect(normalizeRazorpayAmountInr(4999)).toBe(4999);
    expect(Math.round(normalizeRazorpayAmountInr(1177.64)! * 100)).toBe(117764);
  });
  it("rejects invalid payment amounts", () => {
    for (const value of [NaN, Infinity, -10, 0, 10000001])
      expect(normalizeRazorpayAmountInr(value)).toBeNull();
  });
  it("reads only valid public merchant checkout configuration", () => {
    const config = {
      payment_link: { id: "plink_fixture" },
      merchant: { name: "Sheetomatic Technologies" },
      keyless_header: "public-fixture",
    };
    expect(
      readRazorpayHandleConfig(`var data = ${JSON.stringify(config)};`),
    ).toMatchObject({
      merchantName: "Sheetomatic Technologies",
      paymentLinkId: "plink_fixture",
    });
    expect(() => readRazorpayHandleConfig("var data = {};")).toThrow();
  });
});
