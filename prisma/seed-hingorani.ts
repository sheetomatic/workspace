import { readFileSync, existsSync } from "fs";
import path from "path";
import type { Prisma, PrismaClient } from "@prisma/client";
import { normalizeStaffCode } from "../src/lib/legal-cases/access";

const BATCH_SIZE = 500;

function parseCsv(content: string): string[][] {
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

type ParsedCase = {
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
  s2Responsible: string | null;
  s3Responsible: string | null;
  s4Responsible: string | null;
  s5Responsible: string | null;
  s6Responsible: string | null;
  s7Responsible: string | null;
};

const SAMPLE_CASES: ParsedCase[] = [
  {
    fileNumber: "1",
    mccNumber: "986/12",
    applicant: "SAVATRI BAI",
    nonApplicant: "RAM SINGH",
    category: "F",
    caseStage: "ORDER",
    fileStatus: "APPEAL FILED",
    court: "DJ",
    company: "NATIONAL",
    coAdvocate: null,
    prevDate: null,
    nextDate: null,
    remarks: null,
    amdCcStatus: null,
    fNo: null,
    s2Responsible: "MT",
    s3Responsible: null,
    s4Responsible: null,
    s5Responsible: null,
    s6Responsible: null,
    s7Responsible: null,
  },
  {
    fileNumber: "14600",
    mccNumber: "1295/22",
    applicant: "NILESH PATEL",
    nonApplicant: "LALARAM",
    category: "F",
    caseStage: "ORDER",
    fileStatus: "ORDER",
    court: "19th",
    company: "UNITED",
    coAdvocate: "I.P PAL",
    prevDate: null,
    nextDate: "30-Apr-24",
    remarks: null,
    amdCcStatus: null,
    fNo: null,
    s2Responsible: "SHYAM",
    s3Responsible: null,
    s4Responsible: null,
    s5Responsible: null,
    s6Responsible: null,
    s7Responsible: null,
  },
  {
    fileNumber: "13847",
    mccNumber: "1463/21",
    applicant: "MANOHAR SINGH",
    nonApplicant: null,
    category: "GI",
    caseStage: "DEPOSIT",
    fileStatus: "ORDER",
    court: "2nd",
    company: "NEW INDIA",
    coAdvocate: null,
    prevDate: null,
    nextDate: null,
    remarks: null,
    amdCcStatus: null,
    fNo: null,
    s2Responsible: "RP",
    s3Responsible: null,
    s4Responsible: null,
    s5Responsible: null,
    s6Responsible: null,
    s7Responsible: null,
  },
  {
    fileNumber: "6",
    mccNumber: "1179/12",
    applicant: "KAMLA BAI",
    nonApplicant: null,
    category: "F",
    caseStage: "HC",
    fileStatus: "APPEAL FILED",
    court: null,
    company: null,
    coAdvocate: null,
    prevDate: null,
    nextDate: null,
    remarks: null,
    amdCcStatus: null,
    fNo: null,
    s2Responsible: "AK",
    s3Responsible: null,
    s4Responsible: null,
    s5Responsible: null,
    s6Responsible: null,
    s7Responsible: null,
  },
];

function cell(row: string[], index: number) {
  return (row[index] ?? "").trim();
}

function trimOrNull(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildCaseRef(fileNumber: string, mccNumber?: string | null) {
  const file = fileNumber.trim();
  const mcc = mccNumber?.trim();
  return mcc ? `${file}:${mcc}` : file;
}

function toLegalCaseRow(
  organizationId: string,
  input: ParsedCase,
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
    s2Responsible: normalizeStaffCode(input.s2Responsible) || null,
    s3Responsible: normalizeStaffCode(input.s3Responsible) || null,
    s4Responsible: normalizeStaffCode(input.s4Responsible) || null,
    s5Responsible: normalizeStaffCode(input.s5Responsible) || null,
    s6Responsible: normalizeStaffCode(input.s6Responsible) || null,
    s7Responsible: normalizeStaffCode(input.s7Responsible) || null,
    sectionData: {},
  };
}

function parseCsvCases(filePath: string) {
  const content = readFileSync(filePath, "utf8");
  const rows = parseCsv(content);
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
    s2: personResponsibleCols[0] ?? -1,
    s3: personResponsibleCols[2] ?? -1,
    s4: personResponsibleCols[3] ?? -1,
    s5: personResponsibleCols[4] ?? -1,
    s6: personResponsibleCols[5] ?? -1,
    s7: personResponsibleCols[6] ?? -1,
  };

  const seen = new Set<string>();
  const parsed: ParsedCase[] = [];

  for (const row of rows.slice(1)) {
    const fileNumber = cell(row, indexes.fileNumber);
    if (!fileNumber) continue;
    const mccNumber = cell(row, indexes.mccNumber) || null;
    const caseRef = buildCaseRef(fileNumber, mccNumber);
    if (seen.has(caseRef)) continue;
    seen.add(caseRef);

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
      s2Responsible: cell(row, indexes.s2) || null,
      s3Responsible: cell(row, indexes.s3) || null,
      s4Responsible: cell(row, indexes.s4) || null,
      s5Responsible: cell(row, indexes.s5) || null,
      s6Responsible: cell(row, indexes.s6) || null,
      s7Responsible: cell(row, indexes.s7) || null,
    });
  }

  return parsed;
}

export async function seedHingoraniCases(
  prisma: PrismaClient,
  organizationId: string,
  options?: { fullCsvPath?: string; limit?: number },
) {
  const importStartedAt = Date.now();

  await prisma.legalCaseDocument.deleteMany({ where: { organizationId } });
  await prisma.legalCase.deleteMany({ where: { organizationId } });

  const csvPath =
    options?.fullCsvPath ??
    process.env.HINGORANI_CSV_PATH ??
    path.join(process.cwd(), "prisma/data/hingorani_raw.csv");

  let cases: ParsedCase[] = [...SAMPLE_CASES];
  if (existsSync(csvPath)) {
    const parsed = parseCsvCases(csvPath);
    const limit = options?.limit ?? Number(process.env.HINGORANI_IMPORT_LIMIT ?? "0");
    cases = limit > 0 ? parsed.slice(0, limit) : parsed;
    console.log(`Importing ${cases.length} Hingorani cases from ${csvPath}`);
  } else {
    console.log(`No CSV at ${csvPath}; seeding ${cases.length} sample Hingorani cases`);
  }

  for (let index = 0; index < cases.length; index += BATCH_SIZE) {
    const batch = cases.slice(index, index + BATCH_SIZE);
    await prisma.legalCase.createMany({
      data: batch.map((item) => toLegalCaseRow(organizationId, item)),
      skipDuplicates: true,
    });
    const done = Math.min(index + BATCH_SIZE, cases.length);
    if (done % 1000 === 0 || done >= cases.length) {
      console.log(`  ${done} / ${cases.length} cases`);
    }
  }

  const elapsedSec = ((Date.now() - importStartedAt) / 1000).toFixed(1);
  console.log(`Hingorani import finished in ${elapsedSec}s`);
}
