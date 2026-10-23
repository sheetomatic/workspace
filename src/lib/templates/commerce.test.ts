import { describe, expect, it } from "vitest";
import {
  cartProductIds,
  cartTotals,
  financialYear,
  parseTemplateBuyer,
  templateInvoiceNumber,
  templatePriceInr,
} from "./commerce";
import { verifyHmac, assertCapturedPayment } from "./gateway";
import { createHmac } from "node:crypto";
import { templateInvoiceHtml } from "./invoice";

const buyer = {
  name: "Test Buyer",
  email: "buyer@example.test",
  phone: "9999999999",
  billedTo: "",
  address: "1 Test Road",
  city: "Raipur",
  pin: "492001",
  stateCode: "22",
  gstin: "",
};
describe("template pricing and billing", () => {
  it("caps template prices strictly below 999 and preserves lower prices", () => {
    expect(templatePriceInr(9999)).toBe(998);
    expect(templatePriceInr(999)).toBe(998);
    expect(templatePriceInr(499)).toBe(499);
    for (const bad of [-1, 0, 10.5, NaN, Infinity])
      expect(() => templatePriceInr(bad)).toThrow();
  });
  it("rejects empty, duplicated, oversized and malformed carts", () => {
    for (const bad of [
      [],
      ["a", "a"],
      Array(21).fill("a"),
      [null],
      ["../x"],
      "a",
    ])
      expect(() => cartProductIds(bad)).toThrow();
    expect(cartProductIds(["b", "a"])).toEqual(["a", "b"]);
  });
  it("calculates same-state GST in integer paise", () => {
    const t = cartTotals([499, 998], "22", "22");
    expect(t.subtotalPaise).toBe(149700);
    expect(t.cgstPaise).toBe(13473);
    expect(t.sgstPaise).toBe(13473);
    expect(t.igstPaise).toBe(0);
    expect(t.totalPaise).toBe(176646);
  });
  it("uses IGST outside the seller's state and rejects invalid states", () => {
    const t = cartTotals([998], "27", "22");
    expect(t.igstPaise).toBe(17964);
    expect(t.cgstPaise).toBe(0);
    expect(t.totalPaise).toBe(117764);
    expect(() => cartTotals([998], "xx", "22")).toThrow();
  });
  it("validates buyer details and GST-state mismatch", () => {
    expect(parseTemplateBuyer(buyer).billedTo).toBe("Test Buyer");
    expect(() =>
      parseTemplateBuyer({
        ...buyer,
        gstin: "22BPFPK7002F1ZG",
        stateCode: "27",
      }),
    ).toThrow();
    expect(() => parseTemplateBuyer({ ...buyer, pin: "123" })).toThrow();
    expect(() => parseTemplateBuyer({ ...buyer, address: "" })).toThrow();
    expect(() => parseTemplateBuyer({ ...buyer, email: [] })).toThrow();
  });
  it("uses India financial-year boundaries and a dedicated short invoice series", () => {
    expect(financialYear(new Date("2026-03-31T18:29:59Z"))).toBe("2526");
    expect(financialYear(new Date("2026-03-31T18:30:00Z"))).toBe("2627");
    expect(templateInvoiceNumber("2627", 1)).toBe("ST2627/00000001");
    expect(() => templateInvoiceNumber("2627", 1e9)).toThrow();
  });
});
describe("gateway trust boundary", () => {
  it("requires correct HMAC and rejects malformed signatures", () => {
    const signed = createHmac("sha256", "test-secret")
      .update("order_1|pay_1")
      .digest("hex");
    expect(verifyHmac("order_1|pay_1", signed, "test-secret")).toBe(true);
    expect(verifyHmac("order_2|pay_1", signed, "test-secret")).toBe(false);
    expect(verifyHmac("order_1|pay_1", "x", "test-secret")).toBe(false);
    expect(verifyHmac("order_1|pay_1", signed, "")).toBe(false);
  });
  it("accepts only the correct captured INR amount with no refund", () => {
    const p = {
      id: "pay_1",
      order_id: "order_1",
      amount: 117764,
      currency: "INR",
      status: "captured",
      captured: true,
      amount_refunded: 0,
    };
    expect(() =>
      assertCapturedPayment(p, { orderId: "order_1", amount: 117764 }),
    ).not.toThrow();
    for (const patch of [
      { amount: 99800 },
      { order_id: "order_other" },
      { currency: "USD" },
      { status: "authorized" },
      { captured: false },
      { amount_refunded: 1 },
    ])
      expect(() =>
        assertCapturedPayment(
          { ...p, ...patch },
          { orderId: "order_1", amount: 117764 },
        ),
      ).toThrow();
  });
  it("does not invoice unpaid orders and escapes untrusted billing text", () => {
    expect(() =>
      templateInvoiceHtml({
        snapshot: {},
        paidAt: null,
        invoiceNumber: null,
        gatewayPaymentId: null,
      }),
    ).toThrow();
    const s = {
      buyer: { ...buyer, billedTo: "<script>alert(1)</script>" },
      seller: {
        legalName: "Test Seller",
        tradeName: "Test",
        gstin: "22BPFPK7002F1ZG",
        addressLines: ["Test"],
      },
      lines: [{ name: "Test", priceInr: 998, sac: "997331" }],
      totals: cartTotals([998], "22", "22"),
    };
    const html = templateInvoiceHtml({
      snapshot: s,
      paidAt: new Date(),
      invoiceNumber: "ST2627/00000001",
      gatewayPaymentId: "pay_1",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("CGST (9%)");
    expect(html).toContain("SGST (9%)");
  });
});
