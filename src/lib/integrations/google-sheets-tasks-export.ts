import {
  createGoogleSheetsWriteClient,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { resolveSpreadsheetIdForOrganization } from "@/lib/integrations/resolve-sheet-id";
import { tasksToSheetRows, type TaskExportRow } from "@/lib/task-export";

const TASKS_TAB = "Tasks";

export async function exportTasksToGoogleSheet(
  organizationId: string,
  tasks: TaskExportRow[],
) {
  if (!isGoogleSheetsAuthConfigured()) {
    return {
      ok: false as const,
      message:
        "Google Sheets is not configured. Add service account credentials in Settings.",
    };
  }

  const spreadsheetId = await resolveSpreadsheetIdForOrganization(organizationId);
  if (!spreadsheetId) {
    return {
      ok: false as const,
      message: "No spreadsheet linked. Add a Google Sheet ID in Settings.",
    };
  }

  const sheets = createGoogleSheetsWriteClient();
  if (!sheets) {
    return {
      ok: false as const,
      message: "Could not connect to Google Sheets.",
    };
  }

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const hasTasksTab = meta.data.sheets?.some(
      (sheet) => sheet.properties?.title === TASKS_TAB,
    );

    if (!hasTasksTab) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: TASKS_TAB },
              },
            },
          ],
        },
      });
    }

    const rows = tasksToSheetRows(tasks);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${TASKS_TAB}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: rows,
      },
    });

    return {
      ok: true as const,
      message: `Exported ${tasks.length} task${tasks.length === 1 ? "" : "s"} to the "${TASKS_TAB}" tab.`,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message.slice(0, 200) : "Unknown error";
    return {
      ok: false as const,
      message: `Google Sheets export failed. Share the spreadsheet with your service account (Editor). ${detail}`,
    };
  }
}
