/** Seller identity printed on Sheetomatic invoices / quotations. */

export type QuotationAccountDetails = {
  legalName: string;
  tradeName: string;
  addressLines: string[];
  pan: string;
  gstin: string;
  udyamNumber: string;
  accountType: string;
  accountHolder: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  qrImageSrc: string;
};

export const SHEETOMATIC_QUOTATION_ACCOUNT: QuotationAccountDetails = {
  legalName: "Shyam Kumar Banjare",
  tradeName: "SHEETOMATIC TECHNOLOGIES",
  addressLines: [
    "Shop No 2 & 3, SH 16",
    "Near Dinesh Cycle Store, Kalmi, Sakti",
    "Chhattisgarh 495691",
  ],
  pan: "BPFPK7002F",
  gstin: "22BPFPK7002F1ZG",
  udyamNumber: "UDYAM-CG-06-0009880",
  accountType: "Current Account",
  accountHolder: "M/S SHEETOMATIC TECHNOLOGIES",
  bankName: "Bandhan Bank",
  branch: "Malkharoda",
  accountNumber: "2010007774842",
  ifsc: "BDBL0001551",
  upiId: "8076967912@ptyes",
  qrImageSrc: "/images/payments/paytm-qr-sheetomatic-technologies.jpg",
};

export const UDYAM_CERTIFICATE_HREF =
  "/legal/udyam-registration-certificate.pdf";

/** Public GST REG-06. Absolute so a saved invoice PDF keeps a working link. */
export const GST_CERTIFICATE_HREF =
  "https://sheetomatic.com/legal/gst-registration-certificate.pdf";

export function isSheetomaticSellerOrg(org: {
  name?: string | null;
  isPrimary?: boolean;
}) {
  const name = org.name?.trim().toLowerCase() ?? "";
  return org.isPrimary === true || name.includes("sheetomatic");
}

export function quotationAccountForOrganization(org: {
  name?: string | null;
  isPrimary?: boolean;
}): QuotationAccountDetails | null {
  if (isSheetomaticSellerOrg(org)) {
    return SHEETOMATIC_QUOTATION_ACCOUNT;
  }
  return null;
}
