import type { LegalCase } from "@prisma/client";
import * as XLSX from "xlsx";
import { findHeaderRowIndex } from "@/lib/legal-cases/header-aliases";
import { parseCsv, parseLegalCasesRows } from "@/lib/legal-cases/import-csv";
import { getLegalCasesExportHeader } from "@/lib/legal-cases/export-template";
import { asSectionData } from "@/lib/legal-cases/section-data";
import { legalCasesToSheetRows } from "@/lib/legal-cases/sheet-export";
import {
  SHEET_ROW_NUMBER_KEY,
  summarizeSheetImport,
} from "@/lib/legal-cases/sheet-row-sync";

const ACCEPTED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls"]);

export const LEGAL_CASES_FILE_MAX_BYTES = 25 * 1024 * 1024;

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => escapeCsvCell(cell ?? "")).join(",")).join("\n");
}

function sortCasesForExport(cases: LegalCase[]): LegalCase[] {
  return [...cases].sort((left, right) => {
    const leftRow = Number(asSectionData(left.sectionData)[SHEET_ROW_NUMBER_KEY] ?? 0);
    const rightRow = Number(asSectionData(right.sectionData)[SHEET_ROW_NUMBER_KEY] ?? 0);
    if (leftRow && rightRow && leftRow !== rightRow) {
      return leftRow - rightRow;
    }
    if (leftRow && !rightRow) {
      return -1;
    }
    if (!leftRow && rightRow) {
      return 1;
    }
    return left.fileNumber.localeCompare(right.fileNumber, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export function legalCasesToExportRows(cases: LegalCase[], header?: string[]) {
  const exportHeader = header ?? getLegalCasesExportHeader();
  const sorted = sortCasesForExport(cases);
  return {
    header: exportHeader,
    rows: legalCasesToSheetRows(exportHeader, sorted),
  };
}

export function legalCasesToCsv(cases: LegalCase[]): string {
  const { header, rows } = legalCasesToExportRows(cases);
  return rowsToCsv([header, ...rows]);
}

export function legalCasesToXlsxBuffer(cases: LegalCase[]): Buffer {
  const { header, rows } = legalCasesToExportRows(cases);
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "work");
  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
  );
}

function extensionForFilename(filename: string) {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot).toLowerCase() : "";
}

function workbookRowsFromBuffer(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: false,
    raw: false,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The Excel file has no worksheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
    sheet,
    { header: 1, defval: "", raw: false },
  );

  return rows.map((row) => row.map((cell) => String(cell ?? "")));
}

export function parseLegalCasesUpload(params: {
  buffer: Buffer;
  filename: string;
  headerRow?: number;
}) {
  const extension = extensionForFilename(params.filename);
  if (!ACCEPTED_EXTENSIONS.has(extension)) {
    throw new Error("Upload a .csv or .xlsx file.");
  }

  if (params.buffer.byteLength > LEGAL_CASES_FILE_MAX_BYTES) {
    throw new Error("File is too large (max 25 MB).");
  }

  const rows =
    extension === ".csv"
      ? parseCsv(params.buffer.toString("utf8"))
      : workbookRowsFromBuffer(params.buffer);

  if (rows.length === 0) {
    throw new Error("The uploaded file is empty.");
  }

  const headerRow =
    params.headerRow && params.headerRow > 0
      ? params.headerRow
      : findHeaderRowIndex(rows) + 1;
  const parsed = parseLegalCasesRows(rows, { headerRow });
  if (parsed.length === 0) {
    throw new Error(
      "No cases found. Check that the file has a FILE NO. column and the header row setting matches your file.",
    );
  }

  const stats = summarizeSheetImport(rows, headerRow, parsed.length);

  return { parsed, stats, rowCount: rows.length, headerRow, rows };
}

export type LegalCaseImportPreviewSample = {
  fileNumber: string;
  mccNumber: string | null;
  applicant: string | null;
  caseStage: string | null;
  fileStatus: string | null;
};

export type LegalCaseImportPreview = {
  filename: string;
  headerRow: number;
  parsedCount: number;
  stats: ReturnType<typeof summarizeSheetImport>;
  sampleCases: LegalCaseImportPreviewSample[];
  warnings: string[];
  detectedHeaders: string[];
};

export function buildImportPreview(params: {
  buffer: Buffer;
  filename: string;
  headerRow?: number;
  currentCaseCount?: number;
}): LegalCaseImportPreview {
  const { parsed, stats, rowCount, headerRow, rows } = parseLegalCasesUpload(params);
  const headerIndex = Math.max(headerRow - 1, 0);
  const detectedHeaders = (rows[headerIndex] ?? [])
    .map((cell) => cell.trim())
    .filter(Boolean)
    .slice(0, 12);

  const warnings: string[] = [];
  const currentCaseCount = params.currentCaseCount ?? 0;

  if (!detectedHeaders.some((header) => /file\s*no/i.test(header))) {
    warnings.push(
      "No FILE NO. column detected on this header row. Try header row 1 or 2.",
    );
  }

  if (parsed.length < 10) {
    warnings.push(
      `Only ${parsed.length} cases parsed. The header row may be wrong or the file may be incomplete.`,
    );
  }

  if (currentCaseCount >= 100 && parsed.length < currentCaseCount * 0.5) {
    warnings.push(
      `This file has ${parsed.length.toLocaleString()} cases but the portal currently has ${currentCaseCount.toLocaleString()}. Confirm before replacing.`,
    );
  }

  if (stats.sheetFileRows > 0 && parsed.length < stats.sheetFileRows * 0.8) {
    warnings.push(
      `${stats.sheetFileRows.toLocaleString()} rows contain file numbers but only ${parsed.length.toLocaleString()} unique cases were parsed.`,
    );
  }

  if (rowCount <= headerRow) {
    warnings.push("The file has no data rows below the header row.");
  }

  return {
    filename: params.filename,
    headerRow,
    parsedCount: parsed.length,
    stats,
    sampleCases: parsed.slice(0, 8).map((item) => ({
      fileNumber: item.fileNumber,
      mccNumber: item.mccNumber,
      applicant: item.applicant,
      caseStage: item.caseStage,
      fileStatus: item.fileStatus,
    })),
    warnings,
    detectedHeaders,
  };
}
