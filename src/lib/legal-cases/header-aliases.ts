/** Normalize spreadsheet column headers for import/export matching. */

const HEADER_ALIASES: Record<string, string> = {
  "f.no": "FILE NO.",
  "file no.": "FILE NO.",
  "file no": "FILE NO.",
  "mcc no": "MCC NO",
  "mcc no.": "MCC NO",
  "case category": "CASE CATEGORY",
  "case ca": "CASE CATEGORY",
  "case stage": "CASE STAGE",
  "file status": "FILE STATUS",
  "prev date": "PREV DATE",
  "next date": "NEXT DATE",
  "co. advocate": "CO. ADVOCATE",
  "non applicant": "NON APPLICANT",
  "owner/ driver lawyer name": "OWNER/ DRIVER LAWYER NAME",
  "owner/driver lawyer name": "OWNER/ DRIVER LAWYER NAME",
  "od phone no.": "OD PHONE NO.",
  "od phone no": "OD PHONE NO.",
  "remark (requirements)/ proposals": "REMARK (REQUIREMENTS)/ PROPOSALS",
  "amd & cc status": "AMD & CC STATUS",
  "f-no": "F-NO",
  "signing date": "SIGNING DATE",
  "case filed": "CASE FILED",
  "client advance": "CLIENT ADVANCE",
  "person responsible": "PERSON RESPONSIBLE",
  "la status": "LA STATUS",
  "file cover pdf": "FILE COVER PDF",
};

export function normalizeLegalHeader(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  const key = trimmed.toLowerCase().replace(/\s+/g, " ");
  return HEADER_ALIASES[key] ?? trimmed.toUpperCase();
}

export function findHeaderRowIndex(rows: string[][]) {
  for (let index = 0; index < Math.min(rows.length, 5); index += 1) {
    const row = rows[index] ?? [];
    const normalized = row.map((cell) => normalizeLegalHeader(cell));
    if (
      normalized.includes("FILE NO.") ||
      normalized.some((cell) => cell === "F.NO" || cell.includes("FILE NO"))
    ) {
      return index;
    }
  }
  return 0;
}

export function normalizedHeaderRow(rows: string[][], headerIndex: number) {
  return (rows[headerIndex] ?? []).map((cell) => normalizeLegalHeader(cell));
}

export function columnIndex(header: string[], canonicalName: string) {
  const target = normalizeLegalHeader(canonicalName);
  return header.findIndex((item) => item === target);
}
