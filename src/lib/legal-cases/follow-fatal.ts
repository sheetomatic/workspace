import type { LegalCase } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import {
  classifyFollowFatalExclusion,
  doaMonthKey,
  intakeAccidentSummary,
  intakeAddress,
  intakeContact,
  intakeCrimeNo,
  intakeDeceased,
  intakeDoa,
  intakeFieldStaff,
  intakeFirDate,
  intakeRoute,
  intakeSeries,
  intakeThana,
  intakeVehicleReg,
  parseMonthKey,
  type FollowFatalExclusion,
} from "@/lib/legal-cases/intake-fields";
import { listAllLegalViewCases } from "@/lib/legal-cases/view-queries";

export type FollowFatalRow = {
  id: string;
  sno: number;
  followDate: string;
  field: string;
  doa: string;
  firDate: string;
  crimeNo: string;
  fi: string;
  thana: string;
  route: string;
  deceased: string;
  contact: string;
  address: string;
  offending: string;
  vehicle: string;
  series: string;
  status: string;
  insur: string;
  exclusion: FollowFatalExclusion | null;
};

export type FollowFatalResult = {
  rows: FollowFatalRow[];
  total: number;
  monthLabel: string;
  excludedCount: number;
};

function isFollowPipelineCase(legalCase: LegalCase) {
  const doa = intakeDoa(legalCase);
  if (!doa) {
    return false;
  }
  const status = (legalCase.fileStatus ?? "").toUpperCase();
  const stage = (legalCase.caseStage ?? "").toUpperCase();
  if (status.includes("RUNNING") && legalCase.mccNumber?.trim()) {
    return false;
  }
  if (stage.includes("ORDER") || stage.includes("DISMISSED") || stage.includes("CLOSED")) {
    return false;
  }
  return (
    !legalCase.mccNumber?.trim() ||
    /READY|TO BE FILED|NOT FILED|PAPER|SIGN|FILE OWNER|OWNER FILED/i.test(status) ||
    /FILE|PLAINT|PAPER/i.test(stage)
  );
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

export async function buildFollowFatalList(
  user: SessionUser,
  options: {
    month?: string;
    hideExcluded?: boolean;
  } = {},
): Promise<FollowFatalResult> {
  const monthKey = parseMonthKey(options.month) ?? doaMonthKey(
    new Date().toLocaleDateString("en-GB"),
  );
  const cases = await listAllLegalViewCases(user, "all");
  const pipeline = cases.filter(isFollowPipelineCase);

  const filtered = pipeline.filter((legalCase) => {
    if (!monthKey) {
      return true;
    }
    return doaMonthKey(intakeDoa(legalCase)) === monthKey;
  });

  filtered.sort((a, b) => {
    const byField = intakeFieldStaff(a).localeCompare(intakeFieldStaff(b), undefined, {
      sensitivity: "base",
    });
    if (byField !== 0) {
      return byField;
    }
    return intakeDoa(a).localeCompare(intakeDoa(b), undefined, { numeric: true });
  });

  let excludedCount = 0;
  const rows: FollowFatalRow[] = [];

  filtered.forEach((legalCase, index) => {
    const exclusion = classifyFollowFatalExclusion(legalCase);
    if (exclusion) {
      excludedCount += 1;
    }
    if (options.hideExcluded && exclusion) {
      return;
    }

    const company = (legalCase.company ?? "").trim();
    rows.push({
      id: legalCase.id,
      sno: index + 1,
      followDate: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "2-digit",
      }),
      field: intakeFieldStaff(legalCase),
      doa: intakeDoa(legalCase),
      firDate: intakeFirDate(legalCase),
      crimeNo: intakeCrimeNo(legalCase),
      fi: legalCase.caseFiled ?? legalCase.category ?? "",
      thana: intakeThana(legalCase),
      route: intakeRoute(legalCase),
      deceased: intakeDeceased(legalCase),
      contact: intakeContact(legalCase),
      address: intakeAddress(legalCase),
      offending: intakeAccidentSummary(legalCase),
      vehicle: intakeVehicleReg(legalCase),
      series: intakeSeries(legalCase),
      status: legalCase.fileStatus ?? sectionFieldFallback(legalCase, "STATUS"),
      insur: company && !company.toUpperCase().includes("NO INSURANCE") ? "OK" : "",
      exclusion,
    });
  });

  return {
    rows,
    total: rows.length,
    monthLabel: monthKey ? monthLabelFromKey(monthKey) : "All months",
    excludedCount,
  };
}

function sectionFieldFallback(legalCase: LegalCase, key: string) {
  const data = legalCase.sectionData;
  if (!data || typeof data !== "object") {
    return "";
  }
  const value = (data as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}
