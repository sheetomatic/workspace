import type { WhatsAppTemplateCategory } from "@prisma/client";

export type WhatsAppTemplateVariable = {
  name: string;
  example: string;
};

export const WHATSAPP_TEMPLATE_CATEGORY_LABELS: Record<
  WhatsAppTemplateCategory,
  string
> = {
  MARKETING: "Marketing",
  UTILITY: "Utility",
  AUTHENTICATION: "Authentication",
};

export const WHATSAPP_TEMPLATE_STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DISABLED: "Disabled",
} as const;

export function normalizeTemplateName(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function extractTemplateVariables(body: string) {
  const matches = body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  const names = new Set<string>();
  for (const match of matches) {
    names.add(match[1]);
  }
  return [...names];
}

export function buildMetaTemplateComponents(
  body: string,
  variables: WhatsAppTemplateVariable[],
) {
  const variableMap = new Map(
    variables.map((variable) => [variable.name, variable.example.trim()]),
  );
  const orderedNames = extractTemplateVariables(body);

  if (orderedNames.length === 0) {
    return [
      {
        type: "BODY" as const,
        text: body.trim(),
      },
    ];
  }

  const missing = orderedNames.filter((name) => !variableMap.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Add example values for: ${missing.map((name) => `{{${name}}}`).join(", ")}`,
    );
  }

  return [
    {
      type: "BODY" as const,
      text: body.trim(),
      example: {
        body_text_named_params: orderedNames.map((name) => ({
          param_name: name,
          example: variableMap.get(name) ?? "Sample",
        })),
      },
    },
  ];
}

export function buildRedlavaCreateTemplatePayload(params: {
  name: string;
  category: WhatsAppTemplateCategory;
  language: string;
  body: string;
  variables: WhatsAppTemplateVariable[];
}) {
  return {
    name: params.name,
    category: params.category,
    language: params.language,
    components: buildMetaTemplateComponents(params.body, params.variables),
  };
}

/** @deprecated Use buildRedlavaCreateTemplatePayload for RedLava API */
export function buildMetaCreateTemplatePayload(params: {
  name: string;
  category: WhatsAppTemplateCategory;
  language: string;
  body: string;
  variables: WhatsAppTemplateVariable[];
}) {
  return buildRedlavaCreateTemplatePayload(params);
}

export function previewTemplateBody(
  body: string,
  variables: WhatsAppTemplateVariable[],
) {
  let preview = body;
  for (const variable of variables) {
    preview = preview.replaceAll(
      new RegExp(`\\{\\{\\s*${variable.name}\\s*\\}\\}`, "g"),
      variable.example || `[${variable.name}]`,
    );
  }
  return preview;
}

export function mapRemoteTemplateStatus(status: string | undefined) {
  const normalized = status?.toUpperCase() ?? "PENDING";
  if (normalized === "APPROVED" || normalized === "ACTIVE") {
    return "APPROVED" as const;
  }
  if (normalized === "REJECTED") {
    return "REJECTED" as const;
  }
  if (normalized === "DISABLED" || normalized === "PAUSED") {
    return "DISABLED" as const;
  }
  return "PENDING" as const;
}
