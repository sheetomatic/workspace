import type { LegalCase } from "@prisma/client";
import {
  columnIndex,
  normalizedHeaderRow,
} from "@/lib/legal-cases/header-aliases";
import { legalCasesToSheetRows } from "@/lib/legal-cases/sheet-export";

export const SHEET_ROW_NUMBER_KEY = "_sheetRowNumber";

export function normalizeSheetFileNumber(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function cell(row: string[], index: number) {
  return (row[index] ?? "").trim();
}

export function buildSheetFileRowIndex(
  rows: string[][],
  headerRow: number,
) {
  const headerIndex = Math.max(headerRow - 1, 0);
  const header = normalizedHeaderRow(rows, headerIndex);
  const fileCol = columnIndex(header, "FILE NO.");
  const indexByFile = new Map<string, number>();

  if (fileCol < 0) {
    return { header, headerIndex, fileCol, indexByFile, lastUsedRow: headerRow };
  }

  let lastUsedRow = headerRow;
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const fileNumber = normalizeSheetFileNumber(cell(rows[index], fileCol));
    if (!fileNumber) {
      continue;
    }
    const sheetRowNumber = index + 1;
    indexByFile.set(fileNumber, sheetRowNumber);
    lastUsedRow = sheetRowNumber;
  }

  return { header, headerIndex, fileCol, indexByFile, lastUsedRow };
}

export function resolveTargetSheetRow(params: {
  fileNumber: string;
  indexByFile: Map<string, number>;
  lastUsedRow: number;
  dataStartRow: number;
}) {
  const key = normalizeSheetFileNumber(params.fileNumber);
  const existing = params.indexByFile.get(key);
  if (existing) {
    return existing;
  }

  const nextRow = Math.max(params.lastUsedRow + 1, params.dataStartRow);
  params.indexByFile.set(key, nextRow);
  params.lastUsedRow = nextRow;
  return nextRow;
}

export function sheetRowValuesForCase(header: string[], legalCase: LegalCase) {
  return legalCasesToSheetRows(header, [legalCase])[0] ?? [];
}

export function columnIndexToLetter(index: number) {
  let value = index + 1;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

export type SheetRowExportPlan = {
  range: string;
  values: string[][];
};

export function buildRowPreservingExportPlans(params: {
  header: string[];
  cases: LegalCase[];
  rows: string[][];
  headerRow: number;
  dataStartRow: number;
  sheetTitle: string;
}) {
  const { header, indexByFile, lastUsedRow: initialLastRow } = buildSheetFileRowIndex(
    params.rows,
    params.headerRow,
  );

  let lastUsedRow = initialLastRow;
  const lastColumn = columnIndexToLetter(Math.max(header.length, 1) - 1);
  const quotedTitle = `'${params.sheetTitle.replace(/'/g, "''")}'`;
  const plans: SheetRowExportPlan[] = [];

  for (const legalCase of params.cases) {
    const targetRow = resolveTargetSheetRow({
      fileNumber: legalCase.fileNumber,
      indexByFile,
      lastUsedRow,
      dataStartRow: params.dataStartRow,
    });
    lastUsedRow = Math.max(lastUsedRow, targetRow);

    plans.push({
      range: `${quotedTitle}!A${targetRow}:${lastColumn}${targetRow}`,
      values: [sheetRowValuesForCase(header, legalCase)],
    });
  }

  return { plans, lastUsedRow };
}

export function summarizeSheetImport(rows: string[][], headerRow: number, parsedCount: number) {
  const { indexByFile, lastUsedRow } = buildSheetFileRowIndex(rows, headerRow);
  const fileNumbers = [...indexByFile.keys()]
    .map((value) => Number(value.replace(/\D/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0);

  return {
    sheetRows: rows.length,
    sheetLastRow: lastUsedRow,
    sheetFileRows: indexByFile.size,
    parsedCount,
    maxFileNumber: fileNumbers.length > 0 ? Math.max(...fileNumbers) : null,
    minFileNumber: fileNumbers.length > 0 ? Math.min(...fileNumbers) : null,
  };
}
