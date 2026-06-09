import {
  createGoogleSheetsWriteClient,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { resolveSpreadsheetIdForOrganization } from "@/lib/integrations/resolve-sheet-id";
import { listWaCrmContactsForSheetExport } from "@/lib/wa-crm";
import { waCrmContactsToSheetRows } from "@/lib/wa-crm-sheet-export";

export const WA_CRM_SHEET_TAB = "WA CRM";

export type WaCrmSheetExportResult =
  | {
      ok: true;
      exported: number;
      spreadsheetId: string;
      spreadsheetUrl: string;
      sheetTitle: string;
      message: string;
    }
  | {
      ok: false;
      message: string;
    };

export async function exportWaCrmToGoogleSheet(
  organizationId: string,
): Promise<WaCrmSheetExportResult> {
  if (!isGoogleSheetsAuthConfigured()) {
    return {
      ok: false,
      message:
        "Google Sheets export requires service account credentials (GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON or GOOGLE_SHEETS_CLIENT_EMAIL + GOOGLE_SHEETS_PRIVATE_KEY).",
    };
  }

  const spreadsheetId = await resolveSpreadsheetIdForOrganization(organizationId);
  if (!spreadsheetId) {
    return {
      ok: false,
      message:
        "No spreadsheet linked. Add your Google Sheet URL in Workspace Settings (/app/settings).",
    };
  }

  const sheets = createGoogleSheetsWriteClient();
  if (!sheets) {
    return {
      ok: false,
      message: "Could not connect to Google Sheets.",
    };
  }

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const hasCrmTab = meta.data.sheets?.some(
      (sheet) => sheet.properties?.title === WA_CRM_SHEET_TAB,
    );

    if (!hasCrmTab) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: WA_CRM_SHEET_TAB },
              },
            },
          ],
        },
      });
    }

    const contacts = await listWaCrmContactsForSheetExport(organizationId);
    const rows = waCrmContactsToSheetRows(contacts);

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${WA_CRM_SHEET_TAB}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: rows },
    });

    const exported = Math.max(contacts.length, 0);
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

    return {
      ok: true,
      exported,
      spreadsheetId,
      spreadsheetUrl,
      sheetTitle: WA_CRM_SHEET_TAB,
      message: `Exported ${exported} contact${exported === 1 ? "" : "s"} to the "${WA_CRM_SHEET_TAB}" tab.`,
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message.slice(0, 200) : "Unknown error";
    return {
      ok: false,
      message: `Google Sheets export failed. Share the spreadsheet with your service account (Editor). ${detail}`,
    };
  }
}

/** Best-effort background sync; never throws. */
export function triggerWaCrmSheetSync(organizationId: string) {
  if (!isGoogleSheetsAuthConfigured()) {
    return;
  }

  void exportWaCrmToGoogleSheet(organizationId).catch(() => {
    // Ignore background sync failures (webhook / fire-and-forget updates).
  });
}
