import type { LegalCase, Prisma } from "@prisma/client";
import { asSectionData } from "@/lib/legal-cases/section-data";

export const FILE_COVER_JSON_KEY = "_fileCover";

export type ProcessLogEntry = { date: string; process: string };
export type PfTrackingRow = {
  pfLastDt: string;
  vikkyDt: string;
  pareDt: string;
  postDt: string;
  groupDt: string;
};
export type CalledClientEntry = { date: string; by: string };

export type FileCoverData = {
  applicantBy?: string;
  injuredName?: string;
  injuredAge?: string;
  injuredOccupation?: string;
  laStatus?: string;
  doa?: string;
  policeStation?: string;
  dof?: string;
  caseNumber?: string;
  dlNo?: string;
  rto?: string;
  dobDl?: string;
  rcNo?: string;
  permitTo?: string;
  fitnessTo?: string;
  policyNo?: string;
  policyIssue?: string;
  plaintDate?: string;
  plaintBy?: string;
  groupDate?: string;
  groupBy?: string;
  naOdWsDate?: string;
  companyWsDate?: string;
  issuesReadyDate?: string;
  ccReceivedDate?: string;
  ccScanDate?: string;
  ccScanBy?: string;
  dlScan?: string;
  dlScanBy?: string;
  accidentPhoto?: string;
  accidentPhotoBy?: string;
  deceasedDl?: string;
  seizureDate?: string;
  amdDate?: string;
  amdScan?: string;
  driverName?: string;
  stRtNo?: string;
  challanDate?: string;
  processLog: ProcessLogEntry[];
  notes?: string;
  accountDetails?: string;
  passbookDate?: string;
  passbookBy?: string;
  bank?: string;
  utrNo?: string;
  depositDate?: string;
  amount?: string;
  chequeBy?: string;
  pfTracking: PfTrackingRow[];
  calledClientLog: CalledClientEntry[];
  laCalculation?: string;
  advocateDriver?: string;
  advocateOwner?: string;
  advocateInsurance?: string;
  coFileNo?: string;
  partyPhones?: string;
  ownerDriverLawyer?: string;
  odPhone?: string;
};

export const EMPTY_FILE_COVER: FileCoverData = {
  processLog: Array.from({ length: 12 }, () => ({ date: "", process: "" })),
  pfTracking: Array.from({ length: 10 }, () => ({
    pfLastDt: "",
    vikkyDt: "",
    pareDt: "",
    postDt: "",
    groupDt: "",
  })),
  calledClientLog: Array.from({ length: 10 }, () => ({ date: "", by: "" })),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseFileCoverData(sectionData: unknown): FileCoverData {
  const base = structuredClone(EMPTY_FILE_COVER);
  if (!isRecord(sectionData)) {
    return base;
  }
  const raw = sectionData[FILE_COVER_JSON_KEY];
  if (!isRecord(raw)) {
    return base;
  }

  const processLog = Array.isArray(raw.processLog)
    ? raw.processLog.map((entry) => ({
        date: typeof entry?.date === "string" ? entry.date : "",
        process: typeof entry?.process === "string" ? entry.process : "",
      }))
    : base.processLog;

  while (processLog.length < 12) {
    processLog.push({ date: "", process: "" });
  }

  const pfTracking = Array.isArray(raw.pfTracking)
    ? raw.pfTracking.map((row) => ({
        pfLastDt: typeof row?.pfLastDt === "string" ? row.pfLastDt : "",
        vikkyDt: typeof row?.vikkyDt === "string" ? row.vikkyDt : "",
        pareDt: typeof row?.pareDt === "string" ? row.pareDt : "",
        postDt: typeof row?.postDt === "string" ? row.postDt : "",
        groupDt: typeof row?.groupDt === "string" ? row.groupDt : "",
      }))
    : base.pfTracking;

  while (pfTracking.length < 10) {
    pfTracking.push({
      pfLastDt: "",
      vikkyDt: "",
      pareDt: "",
      postDt: "",
      groupDt: "",
    });
  }

  const calledClientLog = Array.isArray(raw.calledClientLog)
    ? raw.calledClientLog.map((entry) => ({
        date: typeof entry?.date === "string" ? entry.date : "",
        by: typeof entry?.by === "string" ? entry.by : "",
      }))
    : base.calledClientLog;

  while (calledClientLog.length < 10) {
    calledClientLog.push({ date: "", by: "" });
  }

  return {
    ...base,
    ...Object.fromEntries(
      Object.entries(raw).filter(
        ([key, value]) =>
          key !== "processLog" &&
          key !== "pfTracking" &&
          key !== "calledClientLog" &&
          typeof value === "string",
      ),
    ),
    processLog,
    pfTracking,
    calledClientLog,
  } as FileCoverData;
}

export function fileCoverFromLegalCase(
  legalCase: Pick<LegalCase, "sectionData" | "coAdvocate">,
): FileCoverData {
  const parsed = parseFileCoverData(legalCase.sectionData);
  const flat = asSectionData(legalCase.sectionData);

  return {
    ...parsed,
    laStatus: parsed.laStatus || flat["LA STATUS"] || "",
    ownerDriverLawyer:
      parsed.ownerDriverLawyer || flat["OWNER/ DRIVER LAWYER NAME"] || "",
    odPhone: parsed.odPhone || flat["OD PHONE NO."] || flat["CONTACT NO."] || "",
    advocateDriver: parsed.advocateDriver || flat["OWNER/ DRIVER LAWYER NAME"] || "",
    advocateInsurance: parsed.advocateInsurance || legalCase.coAdvocate || "",
    coFileNo: parsed.coFileNo || flat["CO. FILE NO."] || "",
  };
}

/** Strip non-JSON values so Prisma + RSC serialization never fail on sectionData. */
export function sanitizeSectionDataJson(
  value: Prisma.InputJsonValue,
): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function mergeSectionDataWithFileCover(
  existing: unknown,
  fileCover: FileCoverData,
  extraFlat: Record<string, string> = {},
): Prisma.InputJsonValue {
  const current = isRecord(existing) ? { ...existing } : {};
  const flat = asSectionData(existing);

  const mergedFlat: Record<string, string> = {
    ...flat,
    ...extraFlat,
  };

  if (fileCover.laStatus?.trim()) {
    mergedFlat["LA STATUS"] = fileCover.laStatus.trim();
  }
  if (fileCover.ownerDriverLawyer?.trim()) {
    mergedFlat["OWNER/ DRIVER LAWYER NAME"] = fileCover.ownerDriverLawyer.trim();
  }
  if (fileCover.odPhone?.trim()) {
    mergedFlat["OD PHONE NO."] = fileCover.odPhone.trim();
  }
  if (fileCover.coFileNo?.trim()) {
    mergedFlat["CO. FILE NO."] = fileCover.coFileNo.trim();
  }

  return sanitizeSectionDataJson({
    ...current,
    ...mergedFlat,
    [FILE_COVER_JSON_KEY]: fileCover,
  });
}

export function fileCoverToCaseScalars(
  fileCover: FileCoverData,
  scalars: {
    fileNumber: string;
    mccNumber?: string | null;
    applicant?: string | null;
    nonApplicant?: string | null;
    category?: string | null;
    court?: string | null;
    company?: string | null;
    fileStatus?: string | null;
    caseStage?: string | null;
    prevDate?: string | null;
    nextDate?: string | null;
    coAdvocate?: string | null;
  },
) {
  return {
    ...scalars,
    coAdvocate:
      scalars.coAdvocate?.trim() ||
      fileCover.advocateInsurance?.trim() ||
      null,
  };
}
