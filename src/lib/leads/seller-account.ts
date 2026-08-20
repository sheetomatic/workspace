/** Seller identity printed on Sheetomatic invoices / quotations. */

export type QuotationAccountDetails = {
  legalName: string;
  addressLines: string[];
  pan: string;
  udyamNumber: string;
  accountType: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
  qrImageSrc: string;
};

export const SHEETOMATIC_QUOTATION_ACCOUNT: QuotationAccountDetails = {
  legalName: "Shyam Kumar Banjare",
  addressLines: [
    "BHOTHIYA, Ward Number 5",
    "Jaijaipur, Janjgir",
    "Janjgir-Champa, Chhattisgarh 495690",
  ],
  pan: "BPFPK7002F",
  udyamNumber: "UDYAM-CG-06-0009880",
  accountType: "Current Account",
  accountHolder: "Shyam Kumar Banjare",
  bankName: "State Bank Of India",
  accountNumber: "44113317196",
  ifsc: "SBIN0064531",
  upiId: "sheetomatic@sbi",
  qrImageSrc: "/images/payments/phonepe-qr-invoice-shyam-kumar-banjare.png",
};

export const UDYAM_CERTIFICATE_HREF =
  "/legal/udyam-registration-certificate.pdf";

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
