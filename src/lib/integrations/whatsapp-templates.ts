/**
 * WhatsApp template management via RedLava API.
 * @see https://wa.redlava.in/Integrations/ApiDocumentation
 */

import type { WhatsAppTemplateCategory } from "@prisma/client";
import {
  buildRedlavaCreateTemplatePayload,
  mapRemoteTemplateStatus,
  type WhatsAppTemplateVariable,
} from "@/lib/whatsapp-templates";
import type { RedlavaCredentials } from "@/lib/integrations/redlava";
import {
  isRedlavaConfigured,
  redlavaRequest,
  redlavaTemplateListEndpoint,
  redlavaTemplateSubmitEndpoint,
  redlavaTemplateSyncEndpoint,
} from "@/lib/integrations/redlava";

export type RemoteWhatsAppTemplate = {
  id?: string;
  name: string;
  status: string;
  category?: string;
  language?: string;
  rejectionReason?: string | null;
  components?: Array<{ type?: string; text?: string }>;
};

export type WhatsAppTemplateSetup = {
  canSend: boolean;
  canManageTemplates: boolean;
  provider: "redlava" | null;
  setupHint: string | null;
};

type RedlavaTemplateRecord = {
  id?: string;
  template?: {
    id?: string;
    name?: string;
    status?: string;
    category?: string;
    language?: string;
    rejected_reason?: string;
    components?: Array<{ type?: string; text?: string }>;
  };
  name?: string;
  status?: string;
  category?: string;
  language?: string;
  components?: Array<{ type?: string; text?: string }>;
};

function normalizeRedlavaTemplate(record: RedlavaTemplateRecord): RemoteWhatsAppTemplate | null {
  const nested = record.template;
  const name = nested?.name ?? record.name;
  if (!name) {
    return null;
  }

  return {
    id: nested?.id ?? record.id,
    name,
    status: nested?.status ?? record.status ?? "PENDING",
    category: nested?.category ?? record.category,
    language: nested?.language ?? record.language ?? "en",
    rejectionReason: nested?.rejected_reason ?? null,
    components: nested?.components ?? record.components,
  };
}

function extractTemplateList(payload: Record<string, unknown>) {
  if (Array.isArray(payload.results)) {
    return payload.results
      .map((item) => normalizeRedlavaTemplate(item as RedlavaTemplateRecord))
      .filter(Boolean) as RemoteWhatsAppTemplate[];
  }

  if (Array.isArray(payload.data)) {
    return payload.data
      .map((item) => normalizeRedlavaTemplate(item as RedlavaTemplateRecord))
      .filter(Boolean) as RemoteWhatsAppTemplate[];
  }

  const candidates = [payload.templates, payload.items];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => normalizeRedlavaTemplate(item as RedlavaTemplateRecord))
        .filter(Boolean) as RemoteWhatsAppTemplate[];
    }
  }

  return [];
}

export function getWhatsAppTemplateSetup(
  credentials?: RedlavaCredentials | null,
): WhatsAppTemplateSetup {
  const configured = isRedlavaConfigured(credentials);

  return {
    canSend: configured,
    canManageTemplates: configured,
    provider: configured ? "redlava" : null,
    setupHint: configured
      ? null
      : "Add your RedLava API key and Phone ID in Settings. Get them from wa.redlava.in.",
  };
}

export function getWhatsAppTemplateProvider(
  credentials?: RedlavaCredentials | null,
) {
  return getWhatsAppTemplateSetup(credentials).provider;
}

export async function syncTemplatesFromRedlavaMeta(
  credentials?: RedlavaCredentials | null,
) {
  if (!isRedlavaConfigured(credentials)) {
    return { ok: false as const, message: "RedLava is not configured." };
  }

  const result = await redlavaRequest(
    redlavaTemplateSyncEndpoint(),
    { method: "GET" },
    credentials,
  );

  if (!result.ok && result.status !== 200) {
    return {
      ok: false as const,
      message: result.error || "Could not sync templates from Meta via RedLava.",
    };
  }

  return { ok: true as const };
}

export async function submitWhatsAppTemplateForApproval(
  params: {
    name: string;
    category: WhatsAppTemplateCategory;
    language: string;
    body: string;
    variables: WhatsAppTemplateVariable[];
  },
  credentials?: RedlavaCredentials | null,
) {
  if (!isRedlavaConfigured(credentials)) {
    return {
      ok: false as const,
      message:
        "RedLava is not configured. Add your API key in WhatsApp Settings.",
    };
  }

  const payload = buildRedlavaCreateTemplatePayload(params);
  const result = await redlavaRequest(
    redlavaTemplateSubmitEndpoint(),
    {
      method: "POST",
      body: payload,
    },
    credentials,
  );

  if (!result.ok) {
    const detail =
      (typeof result.body.error === "string" && result.body.error) ||
      (typeof result.body.message === "string" && result.body.message) ||
      (typeof result.body.detail === "string" && result.body.detail) ||
      result.error;
    return {
      ok: false as const,
      message: detail || "RedLava template submission failed.",
    };
  }

  const body = result.body;
  const nested = body.template as Record<string, unknown> | undefined;
  return {
    ok: true as const,
    provider: "redlava" as const,
    externalId:
      (typeof nested?.id === "string" && nested.id) ||
      (typeof body.id === "string" && body.id) ||
      (typeof body.templateId === "string" && body.templateId) ||
      null,
    status: mapRemoteTemplateStatus(
      (typeof nested?.status === "string" ? nested.status : undefined) ||
        (typeof body.status === "string" ? body.status : "PENDING"),
    ),
    detail:
      typeof body.message === "string"
        ? body.message
        : "Submitted to RedLava for WhatsApp approval.",
  };
}

export async function listRemoteWhatsAppTemplates(
  credentials?: RedlavaCredentials | null,
) {
  if (!isRedlavaConfigured(credentials)) {
    return {
      ok: false as const,
      message:
        "RedLava is not configured. Add your API key in WhatsApp Settings.",
      templates: [] as RemoteWhatsAppTemplate[],
    };
  }

  await syncTemplatesFromRedlavaMeta(credentials);

  const pageSize = 100;
  let current = 1;
  let total = Number.POSITIVE_INFINITY;
  const templates: RemoteWhatsAppTemplate[] = [];

  while (templates.length < total) {
    const result = await redlavaRequest(
      redlavaTemplateListEndpoint(),
      {
        method: "POST",
        body: {
          pagination: { current, pageSize },
          order: [{ fieldName: "creationTime", dir: "desc" }],
          search: [],
        },
      },
      credentials,
    );

    if (!result.ok) {
      return {
        ok: false as const,
        message: result.error || "Could not load templates from RedLava.",
        templates: [] as RemoteWhatsAppTemplate[],
      };
    }

    const page = extractTemplateList(result.body);
    templates.push(...page);

    const reportedTotal =
      typeof result.body.total === "number" ? result.body.total : page.length;
    total = reportedTotal;

    if (page.length < pageSize) {
      break;
    }
    current += 1;
  }

  return {
    ok: true as const,
    provider: "redlava" as const,
    templates,
  };
}

export async function syncWhatsAppTemplateStatuses(
  _organizationId: string,
  syncFromDb: Array<{ id: string; name: string; language: string }>,
  credentials?: RedlavaCredentials | null,
) {
  const remote = await listRemoteWhatsAppTemplates(credentials);
  if (!remote.ok) {
    return { ...remote, updates: [] as never[] };
  }

  if (syncFromDb.length === 0) {
    return {
      ok: true as const,
      provider: remote.provider,
      updates: [],
      message: `Found ${remote.templates.length} template(s) in RedLava. Use Import approved to add them here.`,
    };
  }

  const byKey = new Map(
    remote.templates.map((template) => [
      `${template.name}:${template.language ?? "en"}`,
      template,
    ]),
  );

  const updates = syncFromDb
    .map((record) => {
      const match = byKey.get(`${record.name}:${record.language}`);
      if (!match) {
        return null;
      }
      return {
        id: record.id,
        status: mapRemoteTemplateStatus(match.status),
        externalId: match.id ?? null,
        rejectionReason: match.rejectionReason ?? null,
        approvedAt:
          mapRemoteTemplateStatus(match.status) === "APPROVED"
            ? new Date()
            : null,
      };
    })
    .filter(Boolean);

  if (updates.length === 0) {
    return {
      ok: true as const,
      provider: remote.provider,
      updates,
      message:
        "No matching templates found in RedLava. Try Import approved to pull templates from your RedLava account.",
    };
  }

  return {
    ok: true as const,
    provider: remote.provider,
    updates,
  };
}
