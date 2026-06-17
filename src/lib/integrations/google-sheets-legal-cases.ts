import {
  createGoogleSheetsClient,
  createGoogleSheetsWriteClient,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { resolveLegalSheetConfig } from "@/lib/integrations/resolve-sheet-id";
import {
  buildLegalCasesSheetExportUrl,
  parseCsv,
  parseLegalCasesRows,
  replaceOrganizationLegalCases,
} from "@/lib/legal-cases/import-csv";
import {
  defaultLegalCasesSheetHeader,
  legalCasesToSheetRows,
} from "@/lib/legal-cases/sheet-export";
import { prisma } from "@/lib/db";

const EXPORT_BATCH_SIZE = 500;

function columnIndexToLetter(index: number) {
  let value = index + 1;
  let letters = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

async function resolveSheetConfig(organizationId: string) {
  const config = await resolveLegalSheetConfig(organizationId);
  if (!config) {
    throw new Error(
      "No Google Sheet linked. Add your CRM spreadsheet URL in Settings.",
    );
  }
  return config;
}

async function getSheetTitle(spreadsheetId: string, gid?: string | null) {
  if (!isGoogleSheetsAuthConfigured()) {
    return "Sheet1";
  }

  const sheets = createGoogleSheetsClient();
  if (!sheets) {
    return "Sheet1";
  }

  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets.properties(title,sheetId)",
  });

  if (gid) {
    const numericGid = Number(gid);
    const match = meta.data.sheets?.find(
      (sheet) => sheet.properties?.sheetId === numericGid,
    );
    if (match?.properties?.title) {
      return match.properties.title;
    }
  }

  return meta.data.sheets?.[0]?.properties?.title ?? "Sheet1";
}

export async function fetchLegalCasesSheetRows(organizationId: string) {
  const { spreadsheetId, gid } = await resolveSheetConfig(organizationId);

  if (isGoogleSheetsAuthConfigured()) {
    const sheets = createGoogleSheetsClient();
    if (sheets) {
      const sheetTitle = await getSheetTitle(spreadsheetId, gid);
      const quotedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: quotedTitle,
      });
      const rows = (response.data.values ?? []) as string[][];
      if (rows.length > 0) {
        return { spreadsheetId, gid, sheetTitle, rows };
      }
    }
  }

  const response = await fetch(
    buildLegalCasesSheetExportUrl(spreadsheetId, gid),
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error(
      `Could not download the Google Sheet (HTTP ${response.status}). Share the sheet with your service account or publish CSV export access.`,
    );
  }

  const csv = await response.text();
  const rows = parseCsv(csv);

  return { spreadsheetId, gid, sheetTitle: null, rows };
}

export async function importLegalCasesFromGoogleSheet(organizationId: string) {
  const { rows } = await fetchLegalCasesSheetRows(organizationId);
  const cases = parseLegalCasesRows(rows);

  if (cases.length === 0) {
    throw new Error("No case rows found in the spreadsheet.");
  }

  return cases;
}

export async function listOrganizationLegalCases(organizationId: string) {
  return prisma.legalCase.findMany({
    where: { organizationId },
    orderBy: [{ fileNumber: "asc" }, { mccNumber: "asc" }],
  });
}

export async function exportLegalCasesToGoogleSheet(organizationId: string) {
  if (!isGoogleSheetsAuthConfigured()) {
    throw new Error(
      "Google Sheets export requires service account credentials. Add them in your deployment environment.",
    );
  }

  const { spreadsheetId, gid } = await resolveSheetConfig(organizationId);
  const sheets = createGoogleSheetsWriteClient();
  if (!sheets) {
    throw new Error("Could not connect to Google Sheets.");
  }

  const cases = await listOrganizationLegalCases(organizationId);
  const sheetTitle = await getSheetTitle(spreadsheetId, gid);
  const quotedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;

  let header: string[];
  try {
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${quotedTitle}!1:1`,
    });
    header = ((headerResponse.data.values?.[0] ?? []) as string[]).map(String);
  } catch {
    header = [];
  }

  if (header.every((cell) => !cell.trim())) {
    header = defaultLegalCasesSheetHeader();
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quotedTitle}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    });
  }

  const dataRows = legalCasesToSheetRows(header, cases);
  const lastColumn = columnIndexToLetter(Math.max(header.length, 1) - 1);

  if (dataRows.length === 0) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${quotedTitle}!A2:${lastColumn}`,
    });
    return { exported: 0, spreadsheetId, gid, sheetTitle };
  }

  for (let index = 0; index < dataRows.length; index += EXPORT_BATCH_SIZE) {
    const batch = dataRows.slice(index, index + EXPORT_BATCH_SIZE);
    const startRow = index + 2;
    const endRow = startRow + batch.length - 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${quotedTitle}!A${startRow}:${lastColumn}${endRow}`,
      valueInputOption: "RAW",
      requestBody: { values: batch },
    });
  }

  const trailingStart = dataRows.length + 2;
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quotedTitle}!A${trailingStart}:${lastColumn}`,
  });

  return { exported: cases.length, spreadsheetId, gid, sheetTitle };
}

export async function syncLegalCasesTwoWay(organizationId: string) {
  const importedCases = await importLegalCasesFromGoogleSheet(organizationId);
  const imported = await replaceOrganizationLegalCases(
    prisma,
    organizationId,
    importedCases,
  );
  const { exported, spreadsheetId, gid, sheetTitle } =
    await exportLegalCasesToGoogleSheet(organizationId);

  return {
    imported,
    exported,
    spreadsheetId,
    gid,
    sheetTitle,
  };
}

export async function upsertLegalCaseToGoogleSheet(
  organizationId: string,
  _legalCase: { id: string },
) {
  if (!isGoogleSheetsAuthConfigured()) {
    return;
  }
  await exportLegalCasesToGoogleSheet(organizationId);
}
