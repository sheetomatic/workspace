/**
 * RedLava CSV campaign list, upload results, delivery insights, and message reports.
 * @see wa.redlava.in Reporting ? Campaigns
 */

import {
  redlavaRequest,
  type RedlavaCredentials,
} from "@/lib/integrations/redlava";

export type RedlavaCsvCampaign = {
  id: string;
  name: string;
  campaignType: string;
  phoneNumberId: string;
  fileUploadId: string | null;
  creationTime: number;
  lastUpdateTime?: number;
  message?: {
    templateName?: string;
    language?: string;
  };
  schedule?: {
    exactDateTime?: string | null;
    cronExpression?: string | null;
    delayInMinutes?: number | null;
  };
};

export type RedlavaCampaignUploadResults = Record<string, number>;

export type RedlavaMessageInsight = {
  total: number;
  statuses: Array<{ status: string; count: number }>;
};

export type RedlavaCampaignDetailRow = {
  id: string;
  fileUploadId: string;
  rowNumber: number;
  result: string;
  remark: string | null;
  creationTime: number;
  data: Record<string, string>;
};

export type RedlavaMessageReportRow = {
  id: string;
  creationTime: number;
  lastStatus: string;
  waId: string | null;
  message?: {
    to?: string;
    template?: {
      name?: string;
      components?: Array<{
        parameters?: Array<{ text?: string }>;
      }>;
    };
  };
  error?: { message?: string; title?: string };
};

type ListBody = {
  search?: Array<{ fieldName: string; value: string[]; operator?: string }>;
  pagination?: { current: number; pageSize: number };
  order?: Array<{ fieldName: string; dir: "asc" | "desc" }>;
};

function parseCampaignList(body: Record<string, unknown>) {
  const results = Array.isArray(body.results)
    ? body.results
    : Array.isArray((body.data as Record<string, unknown> | undefined)?.results)
      ? ((body.data as { results: unknown[] }).results)
      : [];

  return results
    .map((item) => item as Record<string, unknown>)
    .filter((item) => typeof item.id === "string" && typeof item.name === "string")
    .map(
      (item): RedlavaCsvCampaign => ({
        id: item.id as string,
        name: item.name as string,
        campaignType: String(item.campaignType ?? "CSV"),
        phoneNumberId: String(item.phoneNumberId ?? ""),
        fileUploadId:
          typeof item.fileUploadId === "string" ? item.fileUploadId : null,
        creationTime: Number(item.creationTime ?? 0),
        lastUpdateTime:
          typeof item.lastUpdateTime === "number"
            ? item.lastUpdateTime
            : undefined,
        message:
          item.message && typeof item.message === "object"
            ? (item.message as RedlavaCsvCampaign["message"])
            : undefined,
        schedule:
          item.schedule && typeof item.schedule === "object"
            ? (item.schedule as RedlavaCsvCampaign["schedule"])
            : undefined,
      }),
    );
}

export async function listRedlavaCsvCampaigns(
  credentials: RedlavaCredentials,
  options?: { pageSize?: number; search?: ListBody["search"] },
) {
  const result = await redlavaRequest(
    "/whatsapp/csvCampaigns",
    {
      method: "POST",
      body: {
        search: options?.search ?? [],
        pagination: { current: 1, pageSize: options?.pageSize ?? 50 },
        order: [{ fieldName: "id", dir: "desc" }],
      },
    },
    credentials,
  );

  if (!result.ok) {
    return result;
  }

  return {
    ok: true as const,
    campaigns: parseCampaignList(result.body),
  };
}

export async function getRedlavaCampaignUploadResults(
  campaignId: string,
  credentials: RedlavaCredentials,
) {
  const result = await redlavaRequest(
    `/whatsapp/csvCampaigns/${encodeURIComponent(campaignId)}/uploadResults`,
    { method: "GET" },
    credentials,
  );

  if (!result.ok) {
    return result;
  }

  const uploadResults: RedlavaCampaignUploadResults = {};
  for (const [key, value] of Object.entries(result.body)) {
    if (typeof value === "number") {
      uploadResults[key] = value;
    }
  }

  return { ok: true as const, uploadResults };
}

export async function getRedlavaCampaignMessageInsight(
  campaignId: string,
  credentials: RedlavaCredentials,
) {
  const result = await redlavaRequest(
    "/whatsapp/report/messageSentReport/insight",
    {
      method: "POST",
      body: {
        search: [{ fieldName: "campaignId", value: [campaignId] }],
        order: [{ fieldName: "creationTime", dir: "desc" }],
      },
    },
    credentials,
  );

  if (!result.ok) {
    return result;
  }

  const body = result.body;
  const statuses = Array.isArray(body.statuses)
    ? body.statuses
        .map((item) => item as Record<string, unknown>)
        .filter(
          (item) =>
            typeof item.status === "string" && typeof item.count === "number",
        )
        .map((item) => ({
          status: item.status as string,
          count: item.count as number,
        }))
    : [];

  return {
    ok: true as const,
    insight: {
      total: typeof body.total === "number" ? body.total : 0,
      statuses,
    } satisfies RedlavaMessageInsight,
  };
}

export async function listRedlavaCampaignDetails(
  fileUploadId: string,
  credentials: RedlavaCredentials,
  pagination: { current: number; pageSize: number },
) {
  const result = await redlavaRequest(
    `/whatsapp/csvCampaignDetails/${encodeURIComponent(fileUploadId)}`,
    {
      method: "POST",
      body: {
        pagination,
        order: [{ fieldName: "creationTime", dir: "desc" }],
        search: [],
      },
    },
    credentials,
  );

  if (!result.ok) {
    return result;
  }

  const results = Array.isArray(result.body.results)
    ? result.body.results
    : [];

  return {
    ok: true as const,
    rows: results.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id ?? ""),
        fileUploadId: String(row.fileUploadId ?? fileUploadId),
        rowNumber: Number(row.rowNumber ?? 0),
        result: String(row.result ?? ""),
        remark: typeof row.remark === "string" ? row.remark : null,
        creationTime: Number(row.creationTime ?? 0),
        data:
          row.data && typeof row.data === "object"
            ? (row.data as Record<string, string>)
            : {},
      } satisfies RedlavaCampaignDetailRow;
    }),
    total: typeof result.body.total === "number" ? result.body.total : results.length,
  };
}

export async function listRedlavaCampaignMessages(
  campaignId: string,
  credentials: RedlavaCredentials,
  pagination: { current: number; pageSize: number },
) {
  const result = await redlavaRequest(
    "/whatsapp/report/messageSentReport",
    {
      method: "POST",
      body: {
        search: [{ fieldName: "campaignId", value: [campaignId] }],
        pagination,
        order: [{ fieldName: "creationTime", dir: "desc" }],
      },
    },
    credentials,
  );

  if (!result.ok) {
    return result;
  }

  const results = Array.isArray(result.body.results)
    ? result.body.results
    : [];

  return {
    ok: true as const,
    rows: results.map((item) => item as RedlavaMessageReportRow),
    total: typeof result.body.total === "number" ? result.body.total : results.length,
  };
}

export const UPLOAD_RESULT_LABELS: Record<
  string,
  { label: string; tone: "success" | "error" | "neutral" }
> = {
  message_accepted_success: {
    label: "Accepted by Meta",
    tone: "success",
  },
  message_sent_failed: {
    label: "Rejected by Meta",
    tone: "error",
  },
  duplicate_number_skipped: {
    label: "Duplicate skipped",
    tone: "neutral",
  },
};

export const MESSAGE_STATUS_LABELS: Record<string, string> = {
  accepted: "Accepted",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
};

export function formatRedlavaEpoch(ms: number) {
  if (!ms) {
    return "-";
  }
  return new Date(ms).toLocaleString("en-IN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function campaignScheduleLabel(campaign: RedlavaCsvCampaign) {
  const exact = campaign.schedule?.exactDateTime;
  if (exact) {
    const parsed = Number(exact);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return formatRedlavaEpoch(parsed);
    }
  }
  return formatRedlavaEpoch(campaign.creationTime);
}
