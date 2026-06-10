/**
 * RedLava bulk CSV campaign send API.
 * @see wa.redlava.in Send Message ? Bulk Message ? CSV Upload
 */

import {
  redlavaBaseUrl,
  resolveRedlavaCredentials,
  type RedlavaCredentials,
} from "@/lib/integrations/redlava";

export const REDLAVA_BULK_SEND_ENDPOINT = "/whatsapp/sendMessageByCampaign1";
export const REDLAVA_SEND_TEMPLATES_ENDPOINT =
  "/messageTemplate/getTemplatesForSendMessage";
export const REDLAVA_TEMPLATE_DETAIL_ENDPOINT =
  "/messageTemplate/getTemplateDetail";

export type RedlavaSendTemplateOption = {
  name: string;
  language: string;
  category?: string;
};

export type RedlavaTemplateComponent = {
  type?: string;
  format?: string;
  text?: string;
  example?: {
    body_text?: string[][];
  };
  buttons?: Array<{ type?: string; text?: string; url?: string }>;
};

export type RedlavaSendTemplateDetail = {
  name: string;
  language: string;
  status?: string;
  category?: string;
  components?: RedlavaTemplateComponent[];
};

export type BulkCsvCampaignPayload = {
  campaignType: "CSV";
  campaignName: string;
  message: {
    templateName: string;
    language: string;
  };
  schedule?: {
    exactDateTime?: number;
    cronExpression?: string | null;
    delayInMinutes?: number | null;
  };
  dripId?: string;
};

function redlavaAuthHeaders(credentials?: RedlavaCredentials | null) {
  const resolved = resolveRedlavaCredentials(credentials);
  if (!resolved?.apiKey) {
    return null;
  }

  return {
    Accept: "application/json",
    "x-api-key": resolved.apiKey,
    ...(resolved.phoneId ? { "x-phone-id": resolved.phoneId } : {}),
  };
}

export async function listRedlavaSendTemplates(
  credentials?: RedlavaCredentials | null,
) {
  const headers = redlavaAuthHeaders(credentials);
  if (!headers) {
    return {
      ok: false as const,
      error: "RedLava is not configured.",
      templates: [] as RedlavaSendTemplateOption[],
    };
  }

  const response = await fetch(
    `${redlavaBaseUrl()}${REDLAVA_SEND_TEMPLATES_ENDPOINT}`,
    { method: "GET", headers },
  );

  const raw = await response.text();
  if (!response.ok) {
    return {
      ok: false as const,
      error: raw.slice(0, 300) || `Could not load templates (${response.status}).`,
      templates: [] as RedlavaSendTemplateOption[],
    };
  }

  let parsed: unknown = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false as const,
      error: "Template list response was not valid JSON.",
      templates: [] as RedlavaSendTemplateOption[],
    };
  }

  const templates = Array.isArray(parsed)
    ? parsed
        .map((item) => item as Record<string, unknown>)
        .filter((item) => typeof item.name === "string")
        .map(
          (item): RedlavaSendTemplateOption => ({
            name: item.name as string,
            language: typeof item.language === "string" ? item.language : "en",
            category:
              typeof item.category === "string" ? item.category : undefined,
          }),
        )
    : [];

  return { ok: true as const, templates };
}

export async function getRedlavaSendTemplateDetail(
  name: string,
  language: string,
  credentials?: RedlavaCredentials | null,
) {
  const headers = redlavaAuthHeaders(credentials);
  if (!headers) {
    return { ok: false as const, error: "RedLava is not configured." };
  }

  const response = await fetch(
    `${redlavaBaseUrl()}${REDLAVA_TEMPLATE_DETAIL_ENDPOINT}`,
    {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, language }),
    },
  );

  const raw = await response.text();
  if (!response.ok) {
    return {
      ok: false as const,
      error: raw.slice(0, 300) || `Could not load template (${response.status}).`,
    };
  }

  try {
    const detail = JSON.parse(raw) as RedlavaSendTemplateDetail;
    return { ok: true as const, detail };
  } catch {
    return { ok: false as const, error: "Template detail response was not valid JSON." };
  }
}

export function extractTemplateCsvColumns(detail: RedlavaSendTemplateDetail) {
  const body = detail.components?.find((component) => component.type === "BODY");
  const examples = body?.example?.body_text?.[0];
  if (Array.isArray(examples) && examples.length > 0) {
    return examples.map((label) => String(label).trim()).filter(Boolean);
  }

  const text = body?.text ?? "";
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
  if (matches.length > 0) {
    return matches.map((_, index) => `Variable ${index + 1}`);
  }

  return [];
}

export function buildTemplatePreviewText(
  detail: RedlavaSendTemplateDetail,
  sampleValues?: string[],
) {
  const body = detail.components?.find((component) => component.type === "BODY");
  const header = detail.components?.find(
    (component) => component.type === "HEADER" && component.text,
  );
  const footer = detail.components?.find(
    (component) => component.type === "FOOTER" && component.text,
  );

  let text = "";
  if (header?.text) {
    text += `${header.text}\n\n`;
  }

  let bodyText = body?.text ?? "";
  const columns = extractTemplateCsvColumns(detail);
  columns.forEach((_, index) => {
    const sample = sampleValues?.[index]?.trim() || `Sample ${index + 1}`;
    bodyText = bodyText.replace(`{{${index + 1}}}`, sample);
  });
  text += bodyText;

  if (footer?.text) {
    text += `\n\n${footer.text}`;
  }

  return text.trim();
}

export async function sendRedlavaBulkCsvCampaign(
  payload: BulkCsvCampaignPayload,
  csvFile: Blob,
  fileName: string,
  credentials?: RedlavaCredentials | null,
) {
  const headers = redlavaAuthHeaders(credentials);
  if (!headers) {
    return { ok: false as const, error: "RedLava is not configured." };
  }

  const formData = new FormData();
  formData.append(
    "jsonData",
    new Blob([JSON.stringify(payload)], { type: "application/json" }),
  );
  formData.append("csvFile", csvFile, fileName);

  const response = await fetch(
    `${redlavaBaseUrl()}${REDLAVA_BULK_SEND_ENDPOINT}`,
    {
      method: "POST",
      headers,
      body: formData,
    },
  );

  const raw = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    body = { raw };
  }

  if (!response.ok) {
    const detail =
      (typeof body.detail === "string" && body.detail) ||
      (typeof body.message === "string" && body.message) ||
      (typeof body.title === "string" && body.title) ||
      raw.slice(0, 400);
    return {
      ok: false as const,
      error: detail || `Bulk campaign submit failed (${response.status}).`,
      body,
    };
  }

  return {
    ok: true as const,
    campaign: {
      id: typeof body.id === "string" ? body.id : null,
      name: typeof body.name === "string" ? body.name : payload.campaignName,
    },
    body,
  };
}
