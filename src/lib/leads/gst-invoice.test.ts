import { describe, expect, it } from "vitest";
import { splitGstLine } from "@/lib/leads/gst-invoice";

describe("GST invoice split", () => {
  it("splits 18% into CGST and SGST inside Chhattisgarh", () => {
    const line = splitGstLine({
      taxable: 10000,
      gstRate: 18,
      placeOfSupplyCode: "22",
    });
    expect(line.cgstPercent).toBe(9);
    expect(line.sgstPercent).toBe(9);
    expect(line.igstPercent).toBe(0);
    expect(line.cgstAmount).toBe(900);
    expect(line.sgstAmount).toBe(900);
    expect(line.gstAmount).toBe(1800);
    expect(line.totalAmount).toBe(11800);
  });

  it("charges IGST when the place of supply is another state", () => {
    const line = splitGstLine({
      taxable: 95452,
      gstRate: 18,
      placeOfSupplyCode: "24",
    });
    expect(line.cgstAmount).toBe(0);
    expect(line.sgstAmount).toBe(0);
    expect(line.igstPercent).toBe(18);
    expect(line.igstAmount).toBe(17181.36);
    expect(line.totalAmount).toBe(112633.36);
  });
});
