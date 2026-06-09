export type LegalSectionNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const LEGAL_SECTION_LABELS: Record<LegalSectionNumber, string> = {
  1: "Identity",
  2: "Court & filing",
  3: "Medical & client",
  4: "RTI & licence",
  5: "Investigation & insurance",
  6: "Banking & settlement",
  7: "High Court",
  8: "Field & evidence",
};

export type DocumentCategory = {
  key: string;
  label: string;
  section: LegalSectionNumber;
  accept: string;
};

export const LEGAL_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  { key: "discharge_card", label: "Discharge card", section: 3, accept: "image/*,application/pdf" },
  { key: "pdc_pdf", label: "PDC", section: 3, accept: "image/*,application/pdf" },
  { key: "final_bill", label: "Final bill", section: 3, accept: "application/pdf,image/*" },
  { key: "medical_bills", label: "Medical bills", section: 3, accept: "application/pdf,image/*" },
  { key: "certified_scan", label: "Certified scan", section: 4, accept: "application/pdf,image/*" },
  { key: "file_cover", label: "File cover", section: 5, accept: "application/pdf,image/*" },
  { key: "permit_vfn", label: "Permit VFN scan", section: 5, accept: "application/pdf,image/*" },
  { key: "fitness_vfn", label: "Fitness VFN scan", section: 5, accept: "application/pdf,image/*" },
  { key: "passbook_scan", label: "Passbook scan", section: 6, accept: "application/pdf,image/*" },
  { key: "cheque_book", label: "Cheque book", section: 6, accept: "application/pdf,image/*" },
  { key: "cancelled_cheque_pdc", label: "Cancelled cheque PDC", section: 6, accept: "application/pdf,image/*" },
  { key: "application_scan", label: "Application scan", section: 6, accept: "application/pdf,image/*" },
  { key: "agreement_scan", label: "Agreement scan", section: 6, accept: "application/pdf,image/*" },
  { key: "hc_agreement_scan", label: "High Court agreement scan", section: 6, accept: "application/pdf,image/*" },
  { key: "pan_scan", label: "PAN scan", section: 6, accept: "application/pdf,image/*" },
  { key: "client_fd_scan", label: "Client FD scan", section: 6, accept: "application/pdf,image/*" },
  { key: "fd_release_docs", label: "FD release docs", section: 6, accept: "application/pdf,image/*" },
  { key: "task_ref_photo", label: "Task ref photo", section: 8, accept: "image/*" },
  { key: "client_photos", label: "Client photos", section: 8, accept: "image/*" },
  { key: "receiving_pdf", label: "Receiving PDF", section: 8, accept: "application/pdf,image/*" },
  { key: "file_draft_pdf", label: "File draft PDF", section: 8, accept: "application/pdf" },
  { key: "amd_scan", label: "AMD scan", section: 8, accept: "application/pdf,image/*" },
  { key: "applicant_evidence", label: "Applicant evidence", section: 8, accept: "application/pdf,image/*" },
  { key: "eyewitness_evidence", label: "Eyewitness evidence", section: 8, accept: "application/pdf,image/*" },
  { key: "doctor_evidence", label: "Doctor evidence", section: 8, accept: "application/pdf,image/*" },
  { key: "income_tax_evidence", label: "Income tax evidence", section: 8, accept: "application/pdf,image/*" },
  { key: "other", label: "Other document", section: 1, accept: "application/pdf,image/*" },
];

export function documentCategoryByKey(key: string) {
  return LEGAL_DOCUMENT_CATEGORIES.find((item) => item.key === key);
}

export function categoriesForSection(section: LegalSectionNumber) {
  return LEGAL_DOCUMENT_CATEGORIES.filter((item) => item.section === section);
}

export const SECTION_RESPONSIBLE_FIELD: Record<
  Exclude<LegalSectionNumber, 1 | 8>,
  | "s2Responsible"
  | "s3Responsible"
  | "s4Responsible"
  | "s5Responsible"
  | "s6Responsible"
  | "s7Responsible"
> = {
  2: "s2Responsible",
  3: "s3Responsible",
  4: "s4Responsible",
  5: "s5Responsible",
  6: "s6Responsible",
  7: "s7Responsible",
};
