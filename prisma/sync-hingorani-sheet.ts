import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));
import {
  buildLegalCasesSheetExportUrl,
  HINGORANI_GOOGLE_SHEET_GID,
  HINGORANI_GOOGLE_SHEET_ID,
  parseLegalCasesCsv,
  replaceOrganizationLegalCases,
} from "../src/lib/legal-cases/import-csv";
import {
  extractSheetGid,
  extractSpreadsheetId,
} from "../src/lib/integrations/resolve-sheet-id";

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.HINGORANI_ORG_SLUG ?? "hingorani";
  const org = await prisma.organization.findUnique({ where: { slug } });

  if (!org) {
    throw new Error(`Organization not found: ${slug}`);
  }

  const spreadsheetId =
    extractSpreadsheetId(org.googleSheetId) ??
    process.env.HINGORANI_GOOGLE_SHEET_ID ??
    HINGORANI_GOOGLE_SHEET_ID;
  const gid =
    org.googleSheetGid ??
    extractSheetGid(org.googleSheetId) ??
    process.env.HINGORANI_GOOGLE_SHEET_GID ??
    HINGORANI_GOOGLE_SHEET_GID;

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      googleSheetId: spreadsheetId,
      googleSheetGid: gid,
    },
  });

  const exportUrl = buildLegalCasesSheetExportUrl(spreadsheetId, gid);

  console.log(`Downloading Google Sheet for ${slug} (${spreadsheetId}, gid=${gid})...`);
  const response = await fetch(exportUrl, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Sheet download failed: HTTP ${response.status}`);
  }

  const csv = await response.text();
  const csvPath = path.join(process.cwd(), "prisma/data/hingorani_raw.csv");
  writeFileSync(csvPath, csv, "utf8");
  console.log(`Saved ${csvPath}`);

  const cases = parseLegalCasesCsv(csv);
  console.log(`Parsed ${cases.length} unique cases`);

  const imported = await replaceOrganizationLegalCases(prisma, org.id, cases);
  console.log(`Imported ${imported} cases into database for ${slug}`);

  const running = cases.filter((item) => item.fileStatus?.toUpperCase() === "RUNNING");
  const withDl = running.filter(
    (item) =>
      item.sectionData["LICENCE NO."] ||
      item.sectionData["DL VFN"] ||
      item.sectionData["DECEASED LICENCE"],
  ).length;
  const withBank = running.filter((item) => item.sectionData["SBI A/C NO."]).length;
  const withCheque = running.filter((item) => item.sectionData["CHEQUE BK"]).length;

  console.log(
    `Running ${running.length} | DL ${withDl} | DL VFN ${running.filter((item) => item.sectionData["DL VFN"]).length} | Bank ${withBank} | Cheque ${withCheque}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
