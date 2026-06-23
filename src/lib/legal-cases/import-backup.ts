import { gzipSync, gunzipSync } from "zlib";
import type { PrismaClient } from "@prisma/client";
import {
  type ParsedLegalCase,
  toLegalCaseRow,
} from "@/lib/legal-cases/import-csv";

type BackupPayload = {
  version: 1;
  cases: ParsedLegalCase[];
};

function serializeBackup(cases: ParsedLegalCase[]): Buffer {
  const payload: BackupPayload = { version: 1, cases };
  return gzipSync(Buffer.from(JSON.stringify(payload), "utf8"));
}

function deserializeBackup(payload: Buffer): ParsedLegalCase[] {
  const parsed = JSON.parse(gunzipSync(payload).toString("utf8")) as BackupPayload;
  if (!parsed?.cases || !Array.isArray(parsed.cases)) {
    throw new Error("Backup file is invalid.");
  }
  return parsed.cases;
}

export async function snapshotLegalCasesBeforeImport(
  prisma: PrismaClient,
  organizationId: string,
  sourceFilename?: string,
) {
  const existing = await prisma.legalCase.findMany({
    where: { organizationId },
    orderBy: [{ fileNumber: "asc" }, { mccNumber: "asc" }],
  });

  if (existing.length === 0) {
    await prisma.legalCaseImportBackup.deleteMany({ where: { organizationId } });
    return 0;
  }

  const cases: ParsedLegalCase[] = existing.map((legalCase) => ({
    fileNumber: legalCase.fileNumber,
    mccNumber: legalCase.mccNumber,
    applicant: legalCase.applicant,
    nonApplicant: legalCase.nonApplicant,
    category: legalCase.category,
    caseStage: legalCase.caseStage,
    fileStatus: legalCase.fileStatus,
    court: legalCase.court,
    company: legalCase.company,
    coAdvocate: legalCase.coAdvocate,
    prevDate: legalCase.prevDate,
    nextDate: legalCase.nextDate,
    remarks: legalCase.remarks,
    amdCcStatus: legalCase.amdCcStatus,
    fNo: legalCase.fNo,
    signingDate: legalCase.signingDate,
    caseFiled: legalCase.caseFiled,
    clientAdvance: legalCase.clientAdvance,
    s2Responsible: legalCase.s2Responsible,
    s3Responsible: legalCase.s3Responsible,
    s4Responsible: legalCase.s4Responsible,
    s5Responsible: legalCase.s5Responsible,
    s6Responsible: legalCase.s6Responsible,
    s7Responsible: legalCase.s7Responsible,
    sectionData:
      legalCase.sectionData && typeof legalCase.sectionData === "object"
        ? (legalCase.sectionData as Record<string, string>)
        : {},
  }));

  const payload = Uint8Array.from(serializeBackup(cases));

  await prisma.legalCaseImportBackup.upsert({
    where: { organizationId },
    create: {
      organizationId,
      caseCount: cases.length,
      sourceFilename: sourceFilename ?? null,
      payload,
    },
    update: {
      caseCount: cases.length,
      sourceFilename: sourceFilename ?? null,
      payload,
      createdAt: new Date(),
    },
  });

  return cases.length;
}

export async function restoreLegalCasesBackup(
  prisma: PrismaClient,
  organizationId: string,
) {
  const backup = await prisma.legalCaseImportBackup.findUnique({
    where: { organizationId },
  });

  if (!backup) {
    throw new Error("No backup found from a previous import.");
  }

  const cases = deserializeBackup(Buffer.from(backup.payload));

  await prisma.legalCaseDocument.deleteMany({ where: { organizationId } });
  await prisma.legalCase.deleteMany({ where: { organizationId } });

  const batchSize = 500;
  for (let index = 0; index < cases.length; index += batchSize) {
    const batch = cases.slice(index, index + batchSize);
    await prisma.legalCase.createMany({
      data: batch.map((item) => toLegalCaseRow(organizationId, item)),
      skipDuplicates: true,
    });
  }

  return { restored: cases.length, backupCreatedAt: backup.createdAt };
}

export async function getLegalCaseImportBackupMeta(
  prisma: PrismaClient,
  organizationId: string,
) {
  const backup = await prisma.legalCaseImportBackup.findUnique({
    where: { organizationId },
    select: {
      caseCount: true,
      sourceFilename: true,
      createdAt: true,
    },
  });

  return backup;
}
