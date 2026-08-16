import { google } from "googleapis";
import { prisma } from "@/lib/db";
import { getGoogleSheetsCredentials } from "@/lib/integrations/google-sheets-auth";
import { buildMsmeWorkbookAoa } from "@/lib/learn/msme-workbook";

function cellToValue(cell: string | number | { f: string }) {
  if (cell && typeof cell === "object" && "f" in cell) {
    return cell.f.startsWith("=") ? cell.f : `=${cell.f}`;
  }
  return cell;
}

export async function getLearnMsmeCopyUrl() {
  const fromEnv = process.env.LEARN_MSME_SHEET_ID?.trim();
  const course = await prisma.trainingCourse.findUnique({
    where: { track: "SHEETS" },
    select: { sampleSheetId: true },
  });
  const id = fromEnv || course?.sampleSheetId || "";
  if (!id) return null;
  return `https://docs.google.com/spreadsheets/d/${id}/copy`;
}

export async function publishMsmeWorkbookToGoogle() {
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

  const existing = await prisma.trainingCourse.findUnique({
    where: { track: "SHEETS" },
    select: { id: true },
  });

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
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { type: "anyone", role: "reader" },
  });

  for (const name of sheetNames) {
    const aoa = tabs[name as keyof typeof tabs] as Array<
      Array<string | number | { f: string }>
    >;
    const values = aoa.map((row) => row.map(cellToValue));
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `'${name}'`,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${name}'!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }

  if (existing) {
    await prisma.trainingCourse.update({
      where: { id: existing.id },
      data: { sampleSheetId: spreadsheetId },
    });
    const preview = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/preview`;
    const { applySheetsTeachingContent } = await import(
      "@/lib/learn/apply-sheets-teaching"
    );
    await applySheetsTeachingContent({ force: true, embedUrl: preview });
  }

  return {
    ok: true as const,
    message: "Google Sheet is ready. Students can File → Make a copy.",
    copyUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/copy`,
  };
}
