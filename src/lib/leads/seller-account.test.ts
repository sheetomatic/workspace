import { describe, expect, it } from "vitest";
import {
  SHEETOMATIC_QUOTATION_ACCOUNT,
  quotationAccountForOrganization,
} from "@/lib/leads/seller-account";

describe("quotation seller account", () => {
  it("prints Sheetomatic PAN, Udyam, bank, and UPI", () => {
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.pan).toBe("BPFPK7002F");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.udyamNumber).toBe(
      "UDYAM-CG-06-0009880",
    );
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.accountNumber).toBe("44113317196");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.ifsc).toBe("SBIN0064531");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.upiId).toBe("sheetomatic@sbi");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.qrImageSrc).toContain("phonepe-qr");
  });

  it("uses Sheetomatic details for the primary org or Sheetomatic name", () => {
    expect(quotationAccountForOrganization({ isPrimary: true })).toEqual(
      SHEETOMATIC_QUOTATION_ACCOUNT,
    );
    expect(
      quotationAccountForOrganization({ name: "Sheetomatic" }),
    ).toEqual(SHEETOMATIC_QUOTATION_ACCOUNT);
    expect(
      quotationAccountForOrganization({ name: "Sheetomatic Technologies" }),
    ).toEqual(SHEETOMATIC_QUOTATION_ACCOUNT);
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.addressLines[2]).toContain("495690");
    expect(quotationAccountForOrganization({ name: "Hingorani" })).toBeNull();
  });
});
