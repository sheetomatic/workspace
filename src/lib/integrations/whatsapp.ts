import { formatTaskDue } from "@/lib/tasks";
import type { TaskPriority } from "@prisma/client";
import {
  isRedlavaConfigured,
  sendRedlavaTextMessage,
  type RedlavaCredentials,
} from "@/lib/integrations/redlava";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return null;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

function buildTaskMessageBody(params: {
  taskTitle: string;
  assigneeName: string;
  priority: TaskPriority;
  dueAt: Date;
  organizationName: string;
  frequencyLabel?: string;
  isRecurring?: boolean;
}) {
  const schedule =
    params.frequencyLabel && params.isRecurring
      ? `Repeats: ${params.frequencyLabel}`
      : params.frequencyLabel
        ? `Frequency: ${params.frequencyLabel}`
        : null;

  return [
    `*New task - ${params.organizationName}*`,
    ``,
    params.taskTitle,
    `Owner: ${params.assigneeName}`,
    `Priority: ${params.priority}`,
    `Due: ${formatTaskDue(params.dueAt)}`,
    schedule,
    ``,
    `_Sheetomatic Task Delegation_`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendViaMetaCloud(params: {
  toPhone: string;
  body: string;
  accessToken?: string | null;
  phoneNumberId?: string | null;
}) {
  const token =
    params.accessToken?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId =
    params.phoneNumberId?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return { sent: false, reason: "not_configured" as const };
  }

  const to = normalizeWhatsAppPhone(params.toPhone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" as const };
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
        to,
        type: "text",
        text: { body: params.body },
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return {
      sent: false,
      reason: "api_error" as const,
      detail: detail.slice(0, 300),
    };
  }

  return { sent: true as const };
}

export async function sendTaskAssignmentWhatsApp(params: {
  toPhone: string;
  taskTitle: string;
  assigneeName: string;
  priority: TaskPriority;
  dueAt: Date;
  organizationName: string;
  organizationId?: string;
  frequencyLabel?: string;
  isRecurring?: boolean;
}) {
  const body = buildTaskMessageBody(params);

  let redlavaCreds: RedlavaCredentials | null = null;
  let metaToken: string | null = null;
  let metaPhoneId: string | null = null;

  if (params.organizationId) {
    const workspace = await resolveWorkspaceWhatsAppCredentials(
      params.organizationId,
    );
    if (workspace.redlavaApiKey) {
      redlavaCreds = {
        apiKey: workspace.redlavaApiKey,
        phoneId: workspace.redlavaPhoneId,
      };
    }
    metaToken = workspace.metaAccessToken;
    metaPhoneId = workspace.redlavaPhoneId;
  }

  if (isRedlavaConfigured(redlavaCreds)) {
    const result = await sendRedlavaTextMessage(
      {
        toPhone: params.toPhone,
        body,
      },
      redlavaCreds,
    );
    if (result.sent) {
      return result;
    }
    if (result.reason === "phone_id_required") {
      return result;
    }
    if (result.reason !== "not_configured") {
      return result;
    }
  }

  return sendViaMetaCloud({
    toPhone: params.toPhone,
    body,
    accessToken: metaToken,
    phoneNumberId: metaPhoneId,
  });
}
