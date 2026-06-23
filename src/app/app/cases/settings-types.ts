import type { LegalCaseImportPreview } from "@/lib/legal-cases/file-import-export";

export type LegalCasesSettingsState = {
  ok: boolean;
  message: string;
  preview?: LegalCaseImportPreview;
  cases?: LegalCaseSearchRow[];
};

export type LegalCaseSearchRow = {
  id: string;
  fileNumber: string;
  mccNumber: string | null;
  applicant: string | null;
  nonApplicant: string | null;
  category: string | null;
  fileStatus: string | null;
  caseStage: string | null;
  court: string | null;
  company: string | null;
  coAdvocate: string | null;
  prevDate: string | null;
  nextDate: string | null;
  remarks: string | null;
  amdCcStatus: string | null;
  fNo: string | null;
  s2Responsible: string | null;
  s3Responsible: string | null;
  s4Responsible: string | null;
  s5Responsible: string | null;
  s6Responsible: string | null;
  s7Responsible: string | null;
};

export const initialLegalCasesSettingsState: LegalCasesSettingsState = {
  ok: false,
  message: "",
};
