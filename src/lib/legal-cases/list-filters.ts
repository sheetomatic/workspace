import { LEGAL_SECTION_LABELS } from "@/lib/legal-cases/constants";
import type { LegalCaseListFilter, LegalListMetric } from "@/lib/legal-cases/queries";

export const LEGAL_CASES_LIST_PATH = "/app/cases/list";

const METRIC_LABELS: Record<LegalListMetric, string> = {
  running: "RUNNING",
  closed: "CLOSED",
  appeal: "APPEAL FILED",
  hearings: "With next date",
};

export function parseLegalListSearchParams(params: {
  q?: string;
  fileStatus?: string;
  caseStage?: string;
  mine?: string;
  assignee?: string;
  section?: string;
  metric?: string;
  page?: string;
}): LegalCaseListFilter & { page: number; mineOnly: boolean } {
  const sectionNum = Number(params.section);
  const sectionFilter =
    sectionNum >= 2 && sectionNum <= 7
      ? (sectionNum as 2 | 3 | 4 | 5 | 6 | 7)
      : undefined;

  const metric =
    params.metric === "running" ||
    params.metric === "closed" ||
    params.metric === "appeal" ||
    params.metric === "hearings"
      ? params.metric
      : undefined;

  return {
    q: params.q,
    fileStatus: params.fileStatus,
    caseStage: params.caseStage,
    assignee: params.assignee,
    section: sectionFilter,
    metric,
    mineOnly: params.mine === "1",
    page: Math.max(1, Number(params.page ?? "1") || 1),
  };
}

export function sectionFilterLabel(section: number) {
  const label =
    LEGAL_SECTION_LABELS[section as keyof typeof LEGAL_SECTION_LABELS];
  return label ? `S${section} · ${label}` : `Section ${section}`;
}

export function buildLegalListTitle(
  filter: Pick<
    LegalCaseListFilter,
    "assignee" | "section" | "fileStatus" | "caseStage" | "metric"
  >,
) {
  const parts: string[] = [];

  if (filter.assignee) {
    parts.push(filter.assignee);
  }
  if (filter.section) {
    parts.push(sectionFilterLabel(filter.section));
  }
  if (filter.metric) {
    parts.push(METRIC_LABELS[filter.metric]);
  }
  if (filter.fileStatus) {
    parts.push(filter.fileStatus);
  }
  if (filter.caseStage) {
    parts.push(filter.caseStage);
  }

  return parts.length > 0 ? parts.join(" · ") : "All cases";
}

export function buildLegalListDescription(total: number) {
  return `${total.toLocaleString()} cases`;
}

export function buildLegalListQuery(
  params: Record<string, string | undefined>,
  page?: number,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }
  if (page && page > 1) {
    search.set("page", String(page));
  } else {
    search.delete("page");
  }
  const query = search.toString();
  return query ? `${LEGAL_CASES_LIST_PATH}?${query}` : LEGAL_CASES_LIST_PATH;
}

export function metricLabel(metric: LegalListMetric) {
  return METRIC_LABELS[metric];
}
