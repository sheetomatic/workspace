import type { TaskPriority } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { WhatsAppTemplateVariable } from "@/lib/whatsapp-templates";
import { formatTaskDue } from "@/lib/tasks";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import {
  ASSIGN_TASK_NEW_TEMPLATE_LANGUAGE,
  ASSIGN_TASK_NEW_TEMPLATE_NAME,
  enforceRedlavaTemplateLanguage,
  isRedlavaConfigured,
  parseWhatsAppSendResponse,
  sendRedlavaTemplateMessage,
  type RedlavaCredentials,
  type RedlavaWhatsAppTemplatePayload,
  type WhatsAppSendResult,
} from "@/lib/integrations/redlava";

type TaskTemplateParams = {
  organizationId: string;
  toPhone: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  assigneeName: string;
  priority: TaskPriority;
  dueAt: Date;
  organizationName: string;
  frequencyLabel?: string;
  isRecurring?: boolean;
  redlavaCreds: RedlavaCredentials | null;
  metaToken: string | null;
  metaPhoneId: string | null;
};

type ResolvedTemplate = {
  name: string;
  language: string;
  body: string;
  variables: WhatsAppTemplateVariable[];
};

/** Approved Meta template `assign_task_new` (UTILITY, language `en`). Positional: {{1}} name, {{2}} title, {{3}} description, {{4}} due. */
export const TASK_ASSIGNMENT_TEMPLATE_NAME = ASSIGN_TASK_NEW_TEMPLATE_NAME;
export const TASK_ASSIGNMENT_TEMPLATE_LANGUAGE = ASSIGN_TASK_NEW_TEMPLATE_LANGUAGE;

/** Legacy synced / env names that must map to assign_task_new before send. */
const TASK_ASSIGNMENT_TEMPLATE_ALIASES = new Set([
  ASSIGN_TASK_NEW_TEMPLATE_NAME,
  "task_assignment",
]);

function isTaskAssignmentTemplateName(name: string) {
  return TASK_ASSIGNMENT_TEMPLATE_ALIASES.has(name.trim());
}

function canonicalTaskAssignmentTemplate(template: ResolvedTemplate): ResolvedTemplate {
  if (!isTaskAssignmentTemplateName(template.name)) {
    return template;
  }
  return {
    ...template,
    name: TASK_ASSIGNMENT_TEMPLATE_NAME,
    language: TASK_ASSIGNMENT_TEMPLATE_LANGUAGE,
    body: template.body?.trim() ? template.body : TASK_ASSIGNMENT_TEMPLATE_BODY,
  };
}

/** Matches approved RedLava/Meta body for `assign_task_new` (header/footer/button are separate components). */
export const TASK_ASSIGNMENT_TEMPLATE_BODY = `Hi {{1}},

You have been assigned a new task.

*Task:* {{2}}
*Description:* {{3}}
*Due Date:* {{4}}

Please check and update the task status in Sheetomatic Tasks.

Regards,
Sheetomatic Automation Team`;

/** Static URL button on `assign_task_new` — no dynamic button params required when sending. */
export const TASK_ASSIGNMENT_TEMPLATE_BUTTON_URL =
  "https://sheetomatic.com/app/tasks";

function resolveOutboundLanguageCode(templateName: string, languageCode: string) {
  if (isTaskAssignmentTemplateName(templateName)) {
    return TASK_ASSIGNMENT_TEMPLATE_LANGUAGE;
  }
  return languageCode.trim() || TASK_ASSIGNMENT_TEMPLATE_LANGUAGE;
}

function isRedlavaServerError(result: WhatsAppSendResult) {
  if (result.sent) {
    return false;
  }
  const detail = result.detail ?? "";
  return (
    detail.includes('"status":500') ||
    detail.includes("Internal Server Error") ||
    detail.includes('"error":"Internal Server Error"')
  );
}

function dedupeResolvedTemplates(templates: ResolvedTemplate[]) {
  const seen = new Set<string>();
  return templates.filter((template) => {
    const key = `${template.name}:${template.language}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildTemplateValueMap(params: TaskTemplateParams) {
  const shortId = params.taskId.slice(0, 8);
  const due = formatTaskDue(params.dueAt);
  const schedule =
    params.frequencyLabel && params.isRecurring
      ? params.frequencyLabel
      : params.frequencyLabel ?? "";

  return new Map<string, string>([
    ["1", params.assigneeName],
    ["2", params.taskTitle],
    ["3", params.taskDescription],
    ["4", due],
    ["assignee_name", params.assigneeName],
    ["assignee", params.assigneeName],
    ["name", params.assigneeName],
    ["task_title", params.taskTitle],
    ["title", params.taskTitle],
    ["task", params.taskTitle],
    ["task_description", params.taskDescription],
    ["description", params.taskDescription],
    ["instructions", params.taskDescription],
    ["due", due],
    ["due_date", due],
    ["due_at", due],
    ["organization", params.organizationName],
    ["org", params.organizationName],
    ["company", params.organizationName],
    ["priority", params.priority],
    ["task_id", shortId],
    ["id", shortId],
    ["frequency", schedule],
    ["schedule", schedule],
  ]);
}

/** Preserves first-seen order of {{n}} placeholders (required for Meta positional templates). */
function extractOrderedTemplateVariables(body: string) {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      ordered.push(name);
    }
  }
  return ordered;
}

function sliceTemplateParam(value: string) {
  return value.trim().slice(0, 900) || "-";
}

function buildAssignTaskNewBodyComponent(params: TaskTemplateParams) {
  const values = buildTemplateValueMap(params);
  return {
    type: "body" as const,
    parameters: ["1", "2", "3", "4"].map((key) => ({
      type: "text" as const,
      text: sliceTemplateParam(values.get(key) ?? "-"),
    })),
  };
}

function buildTemplateComponents(template: ResolvedTemplate, params: TaskTemplateParams) {
  if (isTaskAssignmentTemplateName(template.name)) {
    return [buildAssignTaskNewBodyComponent(params)];
  }

  const orderedNames = extractOrderedTemplateVariables(template.body);
  if (orderedNames.length === 0) {
    return [];
  }

  const values = buildTemplateValueMap(params);
  return [
    {
      type: "body" as const,
      parameters: orderedNames.map((name) => ({
        type: "text" as const,
        text: sliceTemplateParam(
          values.get(name) ?? values.get(name.toLowerCase()) ?? "-",
        ),
      })),
    },
  ];
}

function buildRedlavaTemplatePayload(
  template: ResolvedTemplate,
  params: TaskTemplateParams,
  languageCode: string,
): RedlavaWhatsAppTemplatePayload {
  return enforceRedlavaTemplateLanguage({
    name: template.name,
    language: { code: resolveOutboundLanguageCode(template.name, languageCode) },
    components: buildTemplateComponents(template, params),
  });
}

function toResolvedTemplate(record: {
  name: string;
  language: string;
  body: string;
  variables: unknown;
}): ResolvedTemplate {
  return {
    name: record.name,
    language: record.language,
    body: record.body,
    variables: Array.isArray(record.variables)
      ? (record.variables as WhatsAppTemplateVariable[])
      : [],
  };
}

function buildAssignTaskNewFallback(): ResolvedTemplate {
  const envName = process.env.WHATSAPP_TASK_ASSIGNMENT_TEMPLATE?.trim();
  const resolvedName =
    envName && isTaskAssignmentTemplateName(envName)
      ? TASK_ASSIGNMENT_TEMPLATE_NAME
      : TASK_ASSIGNMENT_TEMPLATE_NAME;

  return canonicalTaskAssignmentTemplate({
    name: resolvedName,
    language: TASK_ASSIGNMENT_TEMPLATE_LANGUAGE,
    body: TASK_ASSIGNMENT_TEMPLATE_BODY,
    variables: [
      { name: "1", example: "Digeshwar" },
      { name: "2", example: "Edit Video" },
      { name: "3", example: "Trim and export the product demo video." },
      { name: "4", example: "Mon, 2 Jun, 5:00 pm" },
    ],
  });
}

async function resolveTaskAssignmentTemplates(
  organizationId: string,
): Promise<ResolvedTemplate[]> {
  const fromDb = await prisma.whatsAppTemplate.findMany({
    where: {
      organizationId,
      name: { in: [...TASK_ASSIGNMENT_TEMPLATE_ALIASES] },
      status: "APPROVED",
    },
    orderBy: [{ approvedAt: "desc" }, { submittedAt: "desc" }],
  });

  if (fromDb.length > 0) {
    const canonical = fromDb
      .map(toResolvedTemplate)
      .map(canonicalTaskAssignmentTemplate)
      .filter(
        (template) =>
          template.name === TASK_ASSIGNMENT_TEMPLATE_NAME &&
          template.language === TASK_ASSIGNMENT_TEMPLATE_LANGUAGE,
      );
    if (canonical.length > 0) {
      return dedupeResolvedTemplates(canonical);
    }
  }

  return [buildAssignTaskNewFallback()];
}

async function sendViaMetaTemplateWithLanguage(
  params: TaskTemplateParams,
  template: ResolvedTemplate,
  languageCode: string,
): Promise<WhatsAppSendResult> {
  const token = params.metaToken?.trim();
  const phoneNumberId = params.metaPhoneId?.trim();
  if (!token || !phoneNumberId) {
    return { sent: false, reason: "not_configured" };
  }

  const to = normalizeWhatsAppPhone(params.toPhone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" };
  }

  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const response = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: buildRedlavaTemplatePayload(
          template,
          params,
          resolveOutboundLanguageCode(template.name, languageCode),
        ),
      }),
    },
  );

  const raw = await response.text();
  const outboundLanguage = resolveOutboundLanguageCode(template.name, languageCode);
  return parseWhatsAppSendResponse(response, raw, {
    messageType: "template",
    templateLanguageCode: outboundLanguage,
  });
}

async function sendTemplatePayload(
  params: TaskTemplateParams,
  template: ResolvedTemplate,
  languageCode: string,
): Promise<WhatsAppSendResult> {
  const outboundLanguage = resolveOutboundLanguageCode(template.name, languageCode);

  const attemptSend = async (
    language: string,
  ): Promise<WhatsAppSendResult> => {
    const payload = buildRedlavaTemplatePayload(template, params, language);

    if (isRedlavaConfigured(params.redlavaCreds)) {
      const result = await sendRedlavaTemplateMessage(
        { toPhone: params.toPhone, template: payload },
        params.redlavaCreds,
      );
      if (result.sent || result.reason === "phone_id_required") {
        return result;
      }
      if (params.metaToken && params.metaPhoneId) {
        return sendViaMetaTemplateWithLanguage(params, template, language);
      }
      return result;
    }

    return sendViaMetaTemplateWithLanguage(params, template, language);
  };

  let result = await attemptSend(outboundLanguage);

  if (
    !result.sent &&
    template.name === TASK_ASSIGNMENT_TEMPLATE_NAME &&
    isRedlavaServerError(result) &&
    outboundLanguage !== TASK_ASSIGNMENT_TEMPLATE_LANGUAGE
  ) {
    result = await attemptSend(TASK_ASSIGNMENT_TEMPLATE_LANGUAGE);
  }

  return result;
}

function isTemplateLanguageMismatch(result: WhatsAppSendResult) {
  if (result.sent) {
    return false;
  }
  const detail = result.detail?.toLowerCase() ?? "";
  return (
    detail.includes("132001") ||
    detail.includes("132000") ||
    detail.includes("language") ||
    detail.includes("locale") ||
    detail.includes("template name") ||
    detail.includes("does not exist")
  );
}

export async function sendTaskAssignmentTemplate(
  params: TaskTemplateParams,
): Promise<WhatsAppSendResult> {
  const templates = dedupeResolvedTemplates([
    buildAssignTaskNewFallback(),
    ...(await resolveTaskAssignmentTemplates(params.organizationId)),
  ]).map(canonicalTaskAssignmentTemplate);

  let lastResult: WhatsAppSendResult = { sent: false, reason: "api_error" };

  for (const template of templates) {
    if (template.name !== TASK_ASSIGNMENT_TEMPLATE_NAME) {
      continue;
    }

    const result = await sendTemplatePayload(
      params,
      template,
      TASK_ASSIGNMENT_TEMPLATE_LANGUAGE,
    );
    if (result.sent || result.reason === "phone_id_required") {
      return result;
    }
    lastResult = result;

    if (isTemplateLanguageMismatch(result)) {
      continue;
    }
    break;
  }

  return lastResult;
}
