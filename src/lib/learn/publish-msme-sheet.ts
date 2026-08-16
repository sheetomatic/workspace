import { google } from "googleapis";
import { withDbRetry } from "@/lib/db";
import { getGoogleSheetsCredentials } from "@/lib/integrations/google-sheets-auth";
import { buildMsmeWorkbookAoa } from "@/lib/learn/msme-workbook";

function cellToValue(cell: string | number | { f: string }) {
  if (cell && typeof cell === "object" && "f" in cell) {
    return cell.f.startsWith("=") ? cell.f : `=${cell.f}`;
  }
  return cell;
}

function googleErrorMessage(error: unknown) {
  const fromApi = (
    error as {
      response?: { data?: { error?: { message?: string } } };
    }
  )?.response?.data?.error?.message;
  if (fromApi) return fromApi;
  if (error instanceof Error && error.message) return error.message;
  return "Google publish failed.";
}

export async function getLearnMsmeCopyUrl() {
  try {
    const fromEnv = process.env.LEARN_MSME_SHEET_ID?.trim();
    if (fromEnv) {
      return `https://docs.google.com/spreadsheets/d/${fromEnv}/copy`;
    }
    const course = await withDbRetry((db) =>
      db.trainingCourse.findUnique({
        where: { track: "SHEETS" },
        select: { sampleSheetId: true },
      }),
    );
    const id = course?.sampleSheetId || "";
    if (!id) return null;
    return `https://docs.google.com/spreadsheets/d/${id}/copy`;
  } catch (error) {
    console.error("[learn] copy url unavailable", error);
    return null;
  }
}

export async function publishMsmeWorkbookToGoogle() {
  try {
    const credentials = getGoogleSheetsCredentials();
    if (!credentials) {
      return {
        ok: false as const,
        message:
          "Google is not connected on the server. Use Download Excel, then Drive → Open with Google Sheets.",
      };
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
      ],
    });
    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });
    const tabs = buildMsmeWorkbookAoa();
    const sheetNames = Object.keys(tabs).filter((name) => name !== "meta");

    const created = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title:
            "Shree Kailash Electricals — training workbook (File → Make a copy)",
        },
        sheets: sheetNames.map((title, index) => ({
          properties: { title, index },
        })),
      },
    });
    const spreadsheetId = created.data.spreadsheetId ?? "";
    if (!spreadsheetId) {
      return { ok: false as const, message: "Google did not return a sheet id." };
    }

    let shareNote = "";
    try {
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: { type: "anyone", role: "reader" },
      });
    } catch (error) {
      console.error("[learn] drive share failed", error);
      shareNote =
        " Sheet is created, but Anyone-with-link share failed — open it as the service account owner and share as Anyone with the link.";
    }

    const data = sheetNames.map((name) => {
      const aoa = tabs[name as keyof typeof tabs] as Array<
        Array<string | number | { f: string }>
      >;
      return {
        range: `'${name}'!A1`,
        values: aoa.map((row) => row.map(cellToValue)),
      };
    });

    try {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data,
        },
      });
    } catch (error) {
      console.error("[learn] batch write failed, writing tabs one by one", error);
      for (const item of data) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: item.range,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: item.values },
        });
      }
    }

    try {
      await withDbRetry((db) =>
        db.trainingCourse.updateMany({
          where: { track: "SHEETS" },
          data: { sampleSheetId: spreadsheetId },
        }),
      );
    } catch (error) {
      console.error("[learn] sampleSheetId save failed", error);
    }

    return {
      ok: true as const,
      message: `Google Sheet is ready. Students can File → Make a copy.${shareNote}`,
      copyUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/copy`,
    };
  } catch (error) {
    console.error("[learn] publish workbook failed", error);
    return {
      ok: false as const,
      message: `${googleErrorMessage(error)} Download Excel still works.`,
    };
  }
}
