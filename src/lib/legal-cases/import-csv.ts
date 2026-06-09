import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeStaffCode } from "@/lib/legal-cases/access";

export const HINGORANI_GOOGLE_SHEET_ID =
  "1Rbow1wttTd0rIxzf_zo9qkKmO1lvFb3keSk1-P-HhKc";

export const HINGORANI_GOOGLE_SHEET_GID = "1228012786";

export function buildLegalCasesSheetExportUrl(
  spreadsheetId: string,
  gid?: string | null,
) {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
  return gid ? `${base}&gid=${encodeURIComponent(gid)}` : base;
}

export const HINGORANI_SHEET_EXPORT_URL = buildLegalCasesSheetExportUrl(
  HINGORANI_GOOGLE_SHEET_ID,
  HINGORANI_GOOGLE_SHEET_GID,
);

const BATCH_SIZE = 500;

export type ParsedLegalCase = {
  fileNumber: string;
  mccNumber: string | null;
  applicant: string | null;
  nonApplicant: string | null;
  category: string | null;
  caseStage: string | null;
  fileStatus: string | null;
  court: string | null;
  company: string | null;
  coAdvocate: string | null;
  prevDate: string | null;
  nextDate: string | null;
  remarks: string | null;
  amdCcStatus: string | null;
  fNo: string | null;
  clientAdvance: string | null;
  caseFiled: string | null;
  signingDate: string | null;
  s2Responsible: string | null;
  s3Responsible: string | null;
  s4Responsible: string | null;
  s5Responsible: string | null;
  s6Responsible: string | null;
  s7Responsible: string | null;
  sectionData: Record<string, string>;
};

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function cell(row: string[], index: number) {
  return (row[index] ?? "").trim();
}

function trimOrNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildCaseRef(fileNumber: string, mccNumber?: string | null) {
  const file = fileNumber.trim();
  const mcc = mccNumber?.trim();
  return mcc ? `${file}:${mcc}` : file;
}

export function toLegalCaseRow(
  organizationId: string,
  input: ParsedLegalCase,
): Prisma.LegalCaseCreateManyInput {
  return {
    organizationId,
    caseRef: buildCaseRef(input.fileNumber, input.mccNumber),
    fileNumber: input.fileNumber.trim(),
    mccNumber: trimOrNull(input.mccNumber),
    applicant: trimOrNull(input.applicant),
    nonApplicant: trimOrNull(input.nonApplicant),
    category: trimOrNull(input.category),
    caseStage: trimOrNull(input.caseStage),
    fileStatus: trimOrNull(input.fileStatus),
    court: trimOrNull(input.court),
    company: trimOrNull(input.company),
    coAdvocate: trimOrNull(input.coAdvocate),
    prevDate: trimOrNull(input.prevDate),
    nextDate: trimOrNull(input.nextDate),
    remarks: trimOrNull(input.remarks),
    amdCcStatus: trimOrNull(input.amdCcStatus),
    fNo: trimOrNull(input.fNo),
    clientAdvance: trimOrNull(input.clientAdvance),
    caseFiled: trimOrNull(input.caseFiled),
    signingDate: trimOrNull(input.signingDate),
    s2Responsible: normalizeStaffCode(input.s2Responsible) || null,
    s3Responsible: normalizeStaffCode(input.s3Responsible) || null,
    s4Responsible: normalizeStaffCode(input.s4Responsible) || null,
    s5Responsible: normalizeStaffCode(input.s5Responsible) || null,
    s6Responsible: normalizeStaffCode(input.s6Responsible) || null,
    s7Responsible: normalizeStaffCode(input.s7Responsible) || null,
    sectionData: input.sectionData,
  };
}

const SCALAR_HEADER_KEYS = new Set([
  "FILE NO.",
  "MCC NO",
  "APPLICANT",
  "NON APPLICANT",
  "CASE CATEGORY",
  "CASE STAGE",
  "FILE STATUS",
  "COURT",
  "COMPANY",
  "CO. ADVOCATE",
  "PREV DATE",
  "NEXT DATE",
  "REMARK (REQUIREMENTS)/ PROPOSALS",
  "AMD & CC STATUS",
  "F-NO",
  "SIGNING DATE",
  "CASE FILED",
  "CLIENT ADVANCE",
  "CHECK DT",
  "PERSON RESPONSIBLE",
  "RESPONSIBLE PERSON EMAIL",
]);

function buildSectionDataFromRow(
  header: string[],
  row: string[],
  mappedIndexes: Set<number>,
): Record<string, string> {
  const sectionData: Record<string, string> = {};
  header.forEach((rawName, index) => {
    if (mappedIndexes.has(index)) return;
    const name = rawName.trim();
    if (!name || name.startsWith("SECTION")) return;
    if (SCALAR_HEADER_KEYS.has(name)) return;
    const value = cell(row, index);
    if (value) sectionData[name] = value;
  });
  return sectionData;
}

export function parseLegalCasesCsv(content: string): ParsedLegalCase[] {
  return parseLegalCasesRows(parseCsv(content));
}

export function parseLegalCasesRows(rows: string[][]): ParsedLegalCase[] {
  const header = rows[0] ?? [];
  const col = (name: string) => header.findIndex((item) => item.trim() === name);
  const personResponsibleCols = header
    .map((item, index) => (item.trim() === "PERSON RESPONSIBLE" ? index : -1))
    .filter((index) => index >= 0);

  const indexes = {
    fileNumber: col("FILE NO."),
    mccNumber: col("MCC NO"),
    applicant: col("APPLICANT"),
    nonApplicant: col("NON APPLICANT"),
    category: col("CASE CATEGORY"),
    caseStage: col("CASE STAGE"),
    fileStatus: col("FILE STATUS"),
    court: col("COURT"),
    company: col("COMPANY"),
    coAdvocate: col("CO. ADVOCATE"),
    prevDate: col("PREV DATE"),
    nextDate: col("NEXT DATE"),
    remarks: col("REMARK (REQUIREMENTS)/ PROPOSALS"),
    amdCcStatus: col("AMD & CC STATUS"),
    fNo: col("F-NO"),
    signingDate: col("SIGNING DATE"),
    caseFiled: col("CASE FILED"),
    clientAdvance: col("CLIENT ADVANCE"),
    s2: personResponsibleCols[0] ?? -1,
    s3: personResponsibleCols[2] ?? -1,
    s4: personResponsibleCols[3] ?? -1,
    s5: personResponsibleCols[4] ?? -1,
    s6: personResponsibleCols[5] ?? -1,
    s7: personResponsibleCols[6] ?? -1,
  };

  const seen = new Set<string>();
  const parsed: ParsedLegalCase[] = [];

  for (const row of rows.slice(1)) {
    const fileNumber = cell(row, indexes.fileNumber);
    if (!fileNumber) continue;
    const mccNumber = cell(row, indexes.mccNumber) || null;
    const caseRef = buildCaseRef(fileNumber, mccNumber);
    if (seen.has(caseRef)) continue;
    seen.add(caseRef);

    const mappedIndexes = new Set(
      Object.values(indexes).filter((index) => index >= 0),
    );

    parsed.push({
      fileNumber,
      mccNumber,
      applicant: cell(row, indexes.applicant) || null,
      nonApplicant: cell(row, indexes.nonApplicant) || null,
      category: cell(row, indexes.category) || null,
      caseStage: cell(row, indexes.caseStage) || null,
      fileStatus: cell(row, indexes.fileStatus) || null,
      court: cell(row, indexes.court) || null,
      company: cell(row, indexes.company) || null,
      coAdvocate: cell(row, indexes.coAdvocate) || null,
      prevDate: cell(row, indexes.prevDate) || null,
      nextDate: cell(row, indexes.nextDate) || null,
      remarks: cell(row, indexes.remarks) || null,
      amdCcStatus: cell(row, indexes.amdCcStatus) || null,
      fNo: cell(row, indexes.fNo) || null,
      signingDate: cell(row, indexes.signingDate) || null,
      caseFiled: cell(row, indexes.caseFiled) || null,
      clientAdvance: cell(row, indexes.clientAdvance) || null,
      s2Responsible: cell(row, indexes.s2) || null,
      s3Responsible: cell(row, indexes.s3) || null,
      s4Responsible: cell(row, indexes.s4) || null,
      s5Responsible: cell(row, indexes.s5) || null,
      s6Responsible: cell(row, indexes.s6) || null,
      s7Responsible: cell(row, indexes.s7) || null,
      sectionData: buildSectionDataFromRow(header, row, mappedIndexes),
    });
  }

  return parsed;
}

export async function replaceOrganizationLegalCases(
  prisma: PrismaClient,
  organizationId: string,
  cases: ParsedLegalCase[],
) {
  await prisma.legalCaseDocument.deleteMany({ where: { organizationId } });
  await prisma.legalCase.deleteMany({ where: { organizationId } });

  for (let index = 0; index < cases.length; index += BATCH_SIZE) {
    const batch = cases.slice(index, index + BATCH_SIZE);
    await prisma.legalCase.createMany({
      data: batch.map((item) => toLegalCaseRow(organizationId, item)),
      skipDuplicates: true,
    });
  }

  return cases.length;
}
