import { formatTaskDue, resolveTaskDescription } from "@/lib/tasks";
import type { TaskPriority } from "@prisma/client";
import {
  isRedlavaConfigured,
  parseWhatsAppSendResponse,
  sendRedlavaWhatsAppMessage,
  type RedlavaCredentials,
  type WhatsAppSendResult,
} from "@/lib/integrations/redlava";
import { sendTaskAssignmentTemplate } from "@/lib/integrations/whatsapp-task-template";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { hasActiveWhatsAppSession } from "@/lib/whatsapp-session";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import { buildTaskActionButtons } from "@/lib/whatsapp-bot/task-user";
import { wrapInteractive } from "@/lib/whatsapp-bot/interactive-menu";

function buildTaskMessageBody(params: {
  taskTitle: string;
  taskDescription: string;
  assigneeName: string;
  priority: TaskPriority;
  dueAt: Date;
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
    `*Task Title*`,
    params.taskTitle,
    ``,
    `*Task Description*`,
    params.taskDescription,
    ``,
    `Assignee: ${params.assigneeName}`,
    `Priority: ${params.priority}`,
    `Due: ${formatTaskDue(params.dueAt)}`,
    schedule,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendViaMetaCloud(params: {
  toPhone: string;
  payload: Record<string, unknown>;
  accessToken?: string | null;
  phoneNumberId?: string | null;
}): Promise<WhatsAppSendResult> {
  const token =
    params.accessToken?.trim() || process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId =
    params.phoneNumberId?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return { sent: false, reason: "not_configured" };
  }

  const to = normalizeWhatsAppPhone(params.toPhone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" };
  }

  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const messageType =
    typeof params.payload.type === "string" ? params.payload.type : undefined;
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
        ...params.payload,
      }),
    },
  );

  const raw = await response.text();
  return parseWhatsAppSendResponse(response, raw, { messageType });
}

async function sendWhatsAppPayload(params: {
  toPhone: string;
  message: Record<string, unknown>;
  redlavaCreds: RedlavaCredentials | null;
  metaToken: string | null;
  metaPhoneId: string | null;
}): Promise<WhatsAppSendResult> {
  if (isRedlavaConfigured(params.redlavaCreds)) {
    const result = await sendRedlavaWhatsAppMessage(
      { toPhone: params.toPhone, message: params.message },
      params.redlavaCreds,
    );
    if (result.sent || result.reason === "phone_id_required") {
      return result;
    }
    if (result.reason !== "not_configured") {
      if (params.metaToken && params.metaPhoneId) {
        return sendViaMetaCloud({
          toPhone: params.toPhone,
          payload: params.message,
          accessToken: params.metaToken,
          phoneNumberId: params.metaPhoneId,
        });
      }
      return result;
    }
  }

  if (params.metaToken && params.metaPhoneId) {
    return sendViaMetaCloud({
      toPhone: params.toPhone,
      payload: params.message,
      accessToken: params.metaToken,
      phoneNumberId: params.metaPhoneId,
    });
  }

  return { sent: false, reason: "not_configured" };
}

type DeliverTaskMessageParams = {
  toPhone: string;
  organizationId?: string;
  body: string;
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  assigneeName: string;
  priority: TaskPriority;
  dueAt: Date;
  organizationName: string;
  frequencyLabel?: string;
  isRecurring?: boolean;
};

async function sendTaskTemplate(params: DeliverTaskMessageParams & {
  redlavaCreds: RedlavaCredentials | null;
  metaToken: string | null;
  metaPhoneId: string | null;
}) {
  return sendTaskAssignmentTemplate({
    organizationId: params.organizationId!,
    toPhone: params.toPhone,
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    taskDescription: params.taskDescription,
    assigneeName: params.assigneeName,
    priority: params.priority,
    dueAt: params.dueAt,
    organizationName: params.organizationName,
    frequencyLabel: params.frequencyLabel,
    isRecurring: params.isRecurring,
    redlavaCreds: params.redlavaCreds,
    metaToken: params.metaToken,
    metaPhoneId: params.metaPhoneId,
  });
}

async function deliverTaskMessage(params: DeliverTaskMessageParams) {
  let redlavaCreds: RedlavaCredentials | null = null;
  let metaToken: string | null = null;
  let metaPhoneId: string | null = null;

  if (params.organizationId) {
    const workspace = await resolveWorkspaceWhatsAppCredentials(params.organizationId);
    if (workspace.redlavaApiKey) {
      redlavaCreds = {
        apiKey: workspace.redlavaApiKey,
        phoneId: workspace.redlavaPhoneId,
      };
    }
    metaToken = workspace.metaAccessToken;
    metaPhoneId =
      workspace.redlavaPhoneId?.trim() ||
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ||
      null;
  }

  const sendParams = {
    toPhone: params.toPhone,
    redlavaCreds,
    metaToken,
    metaPhoneId,
  };

  const templateParams = { ...params, ...sendParams };

  // Template-first: assign_task_new works outside the 24h window for new assignees.
  if (params.organizationId) {
    const templateResult = await sendTaskTemplate(templateParams);
    if (templateResult.sent || templateResult.reason === "phone_id_required") {
      return templateResult;
    }
    if (
      templateResult.reason === "not_configured" ||
      templateResult.reason === "invalid_phone"
    ) {
      return templateResult;
    }
    if (templateResult.reason === "api_error") {
      return templateResult;
    }
  }

  const hasSession = params.organizationId
    ? await hasActiveWhatsAppSession(params.organizationId, params.toPhone)
    : false;

  if (params.organizationId && !hasSession) {
    return {
      sent: false,
      reason: "session_required",
      detail:
        "Could not deliver task assignment. Confirm assign_task_new is approved (language en) in Meta/RedLava.",
    };
  }

  const textResult = await sendWhatsAppPayload({
    ...sendParams,
    message: { type: "text", text: { body: params.body.slice(0, 4096) } },
  });

  if (textResult.sent) {
    const interactivePayload = wrapInteractive(
      buildTaskActionButtons(params.taskId, params.taskTitle),
    );
    await sendWhatsAppPayload({
      ...sendParams,
      message: interactivePayload,
    });
  }

  return textResult;
}

export async function sendTaskAssignmentWhatsApp(params: {
  toPhone: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string | null;
  assigneeName: string;
  priority: TaskPriority;
  dueAt: Date;
  organizationName: string;
  organizationId?: string;
  frequencyLabel?: string;
  isRecurring?: boolean;
}) {
  const taskDescription = resolveTaskDescription(
    params.taskTitle,
    params.taskDescription,
  );
  const body = buildTaskMessageBody({
    taskTitle: params.taskTitle,
    taskDescription,
    assigneeName: params.assigneeName,
    priority: params.priority,
    dueAt: params.dueAt,
    frequencyLabel: params.frequencyLabel,
    isRecurring: params.isRecurring,
  });

  return deliverTaskMessage({
    toPhone: params.toPhone,
    organizationId: params.organizationId,
    body,
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    taskDescription,
    assigneeName: params.assigneeName,
    priority: params.priority,
    dueAt: params.dueAt,
    organizationName: params.organizationName,
    frequencyLabel: params.frequencyLabel,
    isRecurring: params.isRecurring,
  });
}
