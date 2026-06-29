/** Sheetomatic shared leads intake spreadsheet (Phase 1). */
export const DEFAULT_LEADS_SPREADSHEET_ID =
  "1uXA3TsZrT9uZNR3fiooNzBKFRYGrxt_1ydJdyJEt11Y";

export const DEFAULT_LEADS_SPREADSHEET_URL =
  `https://docs.google.com/spreadsheets/d/${DEFAULT_LEADS_SPREADSHEET_ID}/edit`;

export type GoogleSheetsLeadConfig = {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetTab?: string;
  gid?: string;
  headerRow?: number;
};

export function defaultGoogleSheetsLeadConfig(): GoogleSheetsLeadConfig {
  return {
    spreadsheetId: DEFAULT_LEADS_SPREADSHEET_ID,
    spreadsheetUrl: DEFAULT_LEADS_SPREADSHEET_URL,
    headerRow: 1,
  };
}

export function resolveGoogleSheetsLeadConfig(
  config: unknown,
): (GoogleSheetsLeadConfig & { spreadsheetId: string }) | null {
  const raw =
    config && typeof config === "object"
      ? (config as Record<string, unknown>)
      : {};

  const spreadsheetId =
    (typeof raw.spreadsheetId === "string" ? raw.spreadsheetId.trim() : "") ||
    extractIdFromUrl(
      typeof raw.spreadsheetUrl === "string" ? raw.spreadsheetUrl : "",
    ) ||
    DEFAULT_LEADS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    return null;
  }

  return {
    spreadsheetId,
    spreadsheetUrl:
      typeof raw.spreadsheetUrl === "string" ? raw.spreadsheetUrl : undefined,
    sheetTab: typeof raw.sheetTab === "string" ? raw.sheetTab.trim() : undefined,
    gid: typeof raw.gid === "string" ? raw.gid.trim() : undefined,
    headerRow:
      typeof raw.headerRow === "number" && raw.headerRow > 0
        ? Math.floor(raw.headerRow)
        : 1,
  };
}

function extractIdFromUrl(url: string) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] ?? null;
}
