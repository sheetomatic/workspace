import { describe, expect, it } from "vitest";
import { normalizeGstBillParty, parseGstin, splitGstLine } from "@/lib/leads/gst-invoice";

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

describe("GST billed party", () => {
  it("accepts a GSTIN and sets the billed state from it", () => {
    const party = normalizeGstBillParty({
      billedTo: "Acme Furnishings Pvt Ltd",
      gstin: "22bpfpk7002f1zg",
      address: "Shop 2, Main Road",
      city: "Sakti",
      pin: "495691",
    });
    expect(party.ok).toBe(true);
    if (!party.ok) return;
    expect(party.party.gstin).toBe("22BPFPK7002F1ZG");
    expect(party.party.stateCode).toBe("22");
    expect(party.party.pin).toBe("495691");
  });

  it("rejects a GSTIN whose state does not match the billed state", () => {
    const party = normalizeGstBillParty({
      gstin: "22BPFPK7002F1ZG",
      stateCode: "24",
    });
    expect(party.ok).toBe(false);
  });

  it("rejects a PIN that is not 6 digits", () => {
    const party = normalizeGstBillParty({ pin: "4956" });
    expect(party.ok).toBe(false);
  });

  it("allows a bill with no GSTIN", () => {
    expect(parseGstin("").ok).toBe(true);
    const party = normalizeGstBillParty({
      billedTo: "Ramesh Sharma",
      address: "12 Civil Lines",
      city: "Raipur",
      stateCode: "22",
      pin: "492001",
    });
    expect(party.ok).toBe(true);
    if (!party.ok) return;
    expect(party.party.gstin).toBeNull();
  });
});
