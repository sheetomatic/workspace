import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { google } from "googleapis";
import { applySheetsTeachingContent } from "../src/lib/learn/apply-sheets-teaching";
import { buildMsmeWorkbookAoa } from "../src/lib/learn/msme-workbook";
import { getGoogleSheetsCredentials } from "../src/lib/integrations/google-sheets-auth";

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const filePath = join(process.cwd(), file);
    if (!existsSync(filePath)) continue;
    const text = readFileSync(filePath, "utf8");
    const jsonKey = "GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON";
    const jsonMatch = text.match(
      new RegExp(`${jsonKey}\\s*=\\s*([\\s\\S]*?)\\n[A-Z_][A-Z0-9_]*=`),
    );
    if (jsonMatch && !process.env[jsonKey]) {
      let raw = jsonMatch[1].trim();
      if (
        (raw.startsWith("'") && raw.endsWith("'")) ||
        (raw.startsWith('"') && raw.endsWith('"'))
      ) {
        raw = raw.slice(1, -1);
      }
      process.env[jsonKey] = raw;
    }
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("{")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key === jsonKey) continue;
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  }
}

loadEnvFiles();

function cellToValue(cell: string | number | { f: string }) {
  if (cell && typeof cell === "object" && "f" in cell) {
    const formula = cell.f.startsWith("=") ? cell.f : `=${cell.f}`;
    return formula;
  }
  return cell;
}

async function createSharedWorkbook() {
  const credentials = getGoogleSheetsCredentials();
  if (!credentials) {
    console.log("No Google service account — Excel download only.");
    return null;
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
        title: "Shree Kailash Electricals — training workbook (File → Make a copy)",
      },
      sheets: sheetNames.map((name, index) => ({
        properties: { title: name, index },
      })),
    },
  });

  const id = created.data.spreadsheetId;
  if (!id) return null;

  for (const name of sheetNames) {
    const aoa = tabs[name as keyof typeof tabs] as Array<
      Array<string | number | { f: string }>
    >;
    const values = aoa.map((row) => row.map(cellToValue));
    await sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `'${name}'!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
  }

  await drive.permissions.create({
    fileId: id,
    requestBody: { type: "anyone", role: "reader" },
  });

  return id;
}

async function main() {
  const force = process.argv.includes("--force");
  let sheetId = process.env.LEARN_MSME_SHEET_ID?.trim() || "";
  if (!sheetId) {
    sheetId = (await createSharedWorkbook()) ?? "";
  }
  const embedUrl = sheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetId}/preview`
    : null;
  const result = await applySheetsTeachingContent({ embedUrl, force });
  console.log(result);
  if (sheetId) {
    console.log("SHEET_ID", sheetId);
    console.log("COPY", `https://docs.google.com/spreadsheets/d/${sheetId}/copy`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
