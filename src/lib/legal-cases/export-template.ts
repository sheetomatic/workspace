import { defaultLegalCasesSheetHeader } from "@/lib/legal-cases/sheet-export";

let cachedHeader: string[] | null = null;

export function getLegalCasesExportHeader(): string[] {
  if (cachedHeader) {
    return cachedHeader;
  }

  cachedHeader = defaultLegalCasesSheetHeader();
  return cachedHeader;
}
