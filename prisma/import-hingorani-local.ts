import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  parseLegalCasesCsv,
  replaceOrganizationLegalCases,
} from "../src/lib/legal-cases/import-csv";

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sep = trimmed.indexOf("=");
    if (sep <= 0) continue;
    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(process.cwd(), ".env"));
loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env.transcribe.tmp"));

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.HINGORANI_ORG_SLUG ?? "hingorani";
  const csvArg = process.argv[2];
  const csvPath =
    csvArg ??
    path.join(
      process.cwd(),
      "Hingorani Law Firm/worksheet master (20-JUN-26) - work.csv",
    );

  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) throw new Error(`Organization not found: ${slug}`);

  console.log(`Reading ${csvPath}...`);
  const csv = readFileSync(csvPath, "utf8");
  const cases = parseLegalCasesCsv(csv);
  console.log(`Parsed ${cases.length} unique cases`);

  const before = await prisma.legalCase.count({ where: { organizationId: org.id } });
  const imported = await replaceOrganizationLegalCases(prisma, org.id, cases);
  const after = await prisma.legalCase.count({ where: { organizationId: org.id } });

  writeFileSync(
    path.join(process.cwd(), "prisma/data/hingorani_raw.csv"),
    csv,
    "utf8",
  );

  const running = cases.filter((c) => c.fileStatus?.toUpperCase() === "RUNNING");
  const closed = cases.filter((c) => c.fileStatus?.toUpperCase() === "CLOSED");
  const order = cases.filter((c) => c.fileStatus?.toUpperCase() === "ORDER");

  console.log(`Replaced ${before} -> ${after} cases for ${slug}`);
  console.log(
    `Status mix: RUNNING ${running.length} | CLOSED ${closed.length} | ORDER ${order.length}`,
  );
  console.log(`Imported batch size reported: ${imported}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
