import type { InboundLeadStatus } from "@prisma/client";

export const LEADS_PAGE_SIZE = 20;

export type LeadsSortOrder = "newest" | "oldest";

export type LeadsListSearchParams = {
  status?: string;
  category?: string;
  page?: string;
  sort?: string;
  q?: string;
  period?: string;
  week?: string;
  month?: string;
  quarter?: string;
  year?: string;
};

export function parseLeadsListParams(params: LeadsListSearchParams) {
  const pageRaw = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const sort: LeadsSortOrder = params.sort === "oldest" ? "oldest" : "newest";
  const status = parseStatus(params.status);
  const category = params.category?.trim() || undefined;
  const q = params.q?.trim() || undefined;

  return { page, sort, status, category, q, pageSize: LEADS_PAGE_SIZE };
}

import { LEAD_STATUS_ORDER } from "@/lib/leads/status-labels";

function parseStatus(value: string | undefined): InboundLeadStatus | undefined {
  const allowed = LEAD_STATUS_ORDER;
  const normalized = value?.trim().toUpperCase() as InboundLeadStatus | undefined;
  return normalized && allowed.includes(normalized) ? normalized : undefined;
}

export function buildLeadsListQuery(
  base: LeadsListSearchParams,
  patch: Partial<LeadsListSearchParams>,
) {
  const merged = { ...base, ...patch };
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value?.trim()) {
      search.set(key, value.trim());
    }
  }
  return search.toString();
}
