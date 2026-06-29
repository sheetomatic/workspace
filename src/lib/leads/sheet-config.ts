import {
  extractSheetGid,
  extractSpreadsheetId,
} from "@/lib/integrations/resolve-sheet-id";

/** Sheetomatic shared leads intake spreadsheet (Phase 1). */
export const DEFAULT_LEADS_SPREADSHEET_ID =
  "1uXA3TsZrT9uZNR3fiooNzBKFRYGrxt_1ydJdyJEt11Y";

/** Google Form responses tab GID for the shared intake sheet. */
export const DEFAULT_LEADS_SPREADSHEET_GID = "1019902152";

export const DEFAULT_LEADS_SHEET_TAB =
  process.env.LEAD_CAPTURE_FORM_RESPONSES_TAB?.trim() || "Form Responses 1";

export const DEFAULT_LEADS_SPREADSHEET_URL =
  `https://docs.google.com/spreadsheets/d/${DEFAULT_LEADS_SPREADSHEET_ID}/edit?gid=${DEFAULT_LEADS_SPREADSHEET_GID}`;

export type GoogleSheetsLeadConfig = {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetTab?: string;
  gid?: string;
  headerRow?: number;
};

export type ResolvedGoogleSheetsLeadConfig = GoogleSheetsLeadConfig & {
  spreadsheetId: string;
  gid: string;
};

export function defaultGoogleSheetsLeadConfig(): ResolvedGoogleSheetsLeadConfig {
  return {
    spreadsheetId: DEFAULT_LEADS_SPREADSHEET_ID,
    spreadsheetUrl: DEFAULT_LEADS_SPREADSHEET_URL,
    gid: DEFAULT_LEADS_SPREADSHEET_GID,
    sheetTab: DEFAULT_LEADS_SHEET_TAB,
    headerRow: 1,
  };
}

export function buildGoogleSheetsLeadConfigFromInput(params: {
  spreadsheetUrl: string;
  sheetTab?: string;
  headerRow?: number;
}): ResolvedGoogleSheetsLeadConfig {
  const defaults = defaultGoogleSheetsLeadConfig();
  const spreadsheetUrl = params.spreadsheetUrl.trim() || defaults.spreadsheetUrl!;
  const spreadsheetId =
    extractSpreadsheetId(spreadsheetUrl) ?? defaults.spreadsheetId;
  const gid =
    extractSheetGid(spreadsheetUrl) ??
    defaults.gid;

  return {
    spreadsheetId,
    spreadsheetUrl,
    gid,
    sheetTab: params.sheetTab?.trim() || defaults.sheetTab,
    headerRow:
      params.headerRow && params.headerRow > 0
        ? Math.floor(params.headerRow)
        : defaults.headerRow ?? 1,
  };
}

export function resolveGoogleSheetsLeadConfig(
  config: unknown,
): ResolvedGoogleSheetsLeadConfig | null {
  const raw =
    config && typeof config === "object"
      ? (config as Record<string, unknown>)
      : {};

  const spreadsheetUrl =
    typeof raw.spreadsheetUrl === "string" ? raw.spreadsheetUrl.trim() : "";

  const spreadsheetId =
    (typeof raw.spreadsheetId === "string" ? raw.spreadsheetId.trim() : "") ||
    extractSpreadsheetId(spreadsheetUrl) ||
    DEFAULT_LEADS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    return null;
  }

  const gid =
    (typeof raw.gid === "string" ? raw.gid.trim() : "") ||
    extractSheetGid(spreadsheetUrl) ||
    DEFAULT_LEADS_SPREADSHEET_GID;

  return {
    spreadsheetId,
    spreadsheetUrl: spreadsheetUrl || DEFAULT_LEADS_SPREADSHEET_URL,
    gid,
    sheetTab:
      typeof raw.sheetTab === "string" && raw.sheetTab.trim()
        ? raw.sheetTab.trim()
        : DEFAULT_LEADS_SHEET_TAB,
    headerRow:
      typeof raw.headerRow === "number" && raw.headerRow > 0
        ? Math.floor(raw.headerRow)
        : 1,
  };
}
