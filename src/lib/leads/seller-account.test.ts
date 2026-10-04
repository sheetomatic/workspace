import { describe, expect, it } from "vitest";
import {
  SHEETOMATIC_QUOTATION_ACCOUNT,
  quotationAccountForOrganization,
  resolveQuotationAccount,
} from "@/lib/leads/seller-account";

describe("quotation seller account", () => {
  it("prints Sheetomatic PAN, Udyam, bank, and UPI", () => {
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.tradeName).toBe(
      "SHEETOMATIC TECHNOLOGIES",
    );
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.gstin).toBe("22BPFPK7002F1ZG");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.pan).toBe("BPFPK7002F");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.udyamNumber).toBe(
      "UDYAM-CG-06-0009880",
    );
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.accountHolder).toBe(
      "M/S SHEETOMATIC TECHNOLOGIES",
    );
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.bankName).toBe("Bandhan Bank");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.branch).toBe("Malkharoda");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.accountNumber).toBe("2010007774842");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.ifsc).toBe("BDBL0001551");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.upiId).toBe("8076967912@ptyes");
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.qrImageSrc).toContain("paytm-qr");
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
    expect(SHEETOMATIC_QUOTATION_ACCOUNT.addressLines[2]).toContain("495691");
    expect(quotationAccountForOrganization({ name: "Hingorani" })).toBeNull();
  });

  it("lets a workspace replace the printed GST identity", () => {
    const account = resolveQuotationAccount({
      isPrimary: true,
      quotationAccount: {
        legalName: "New Legal Name",
        tradeName: "NEW TRADE",
        gstin: "22BPFPK7002F1ZG",
        addressLines: ["12 Ring Road", "Ahmedabad, Gujarat 380001"],
        authorisedSignatory: "New Signatory",
      },
    });
    expect(account?.legalName).toBe("New Legal Name");
    expect(account?.tradeName).toBe("NEW TRADE");
    expect(account?.gstin).toBe("22BPFPK7002F1ZG");
    expect(account?.pan).toBe("BPFPK7002F");
    expect(account?.addressLines).toEqual([
      "12 Ring Road",
      "Ahmedabad, Gujarat 380001",
    ]);
    expect(account?.authorisedSignatory).toBe("New Signatory");
    expect(account?.bankName).toBe("Bandhan Bank");
  });
});
