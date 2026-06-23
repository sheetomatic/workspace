import { readFileSync } from "fs";
import { join } from "path";
import { parseCsv } from "@/lib/legal-cases/import-csv";
import { defaultLegalCasesSheetHeader } from "@/lib/legal-cases/sheet-export";

let cachedHeader: string[] | null = null;

export function getLegalCasesExportHeader(): string[] {
  if (cachedHeader) {
    return cachedHeader;
  }

  try {
    const path = join(process.cwd(), "prisma/data/hingorani_raw.csv");
    const content = readFileSync(path, "utf8");
    const rows = parseCsv(content);
    cachedHeader = rows[0]?.length ? rows[0] : defaultLegalCasesSheetHeader();
  } catch {
    cachedHeader = defaultLegalCasesSheetHeader();
  }

  return cachedHeader;
}
