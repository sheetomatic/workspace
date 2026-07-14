import { prisma } from "@/lib/db";
import {
  parseTaskFromInstruction,
  transcribeAudioBuffer,
} from "@/lib/integrations/openai";
import { generateKnowledgeReply } from "@/lib/integrations/knowledge-reply";
import {
  getKnowledgeItemForOrg,
  getKnowledgeMenuItems,
} from "@/lib/ai-knowledge-store";
import { mapOpenAiServiceError } from "@/lib/integrations/openai-messages";
import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/lib/phone";
import { createDelegatedTaskFromDraft } from "@/lib/tasks/create-from-draft";
import { formatTaskDue } from "@/lib/tasks";
import {
  isWhatsAppGreeting,
  isWhatsAppMenuCommand,
  normalizeWhatsAppCommand,
} from "@/lib/whatsapp-bot/normalize-command";
import { downloadWhatsAppMedia } from "@/lib/whatsapp-bot/media";
import {
  buildCtaUrlInteractive,
  buildDelegatePromptButtons,
  buildMainMenuList,
  buildPostTaskButtons,
  WA_MENU,
  wrapInteractive,
  type WaMenuActionId,
} from "@/lib/whatsapp-bot/interactive-menu";
import {
  buildCustomerFollowUpButtons,
  buildCustomerKnowledgeMenu,
  customerAskPromptText,
  customerHumanHelpText,
  customerKnowledgeMenuFallback,
  formatKnowledgeItemReply,
  mapCustomerTextShortcut,
  parseCustomerMenuAction,
  parseKnowledgeItemId,
  sortKnowledgeMenuItems,
  WA_CUSTOMER_MENU,
  type WaCustomerMenuActionId,
} from "@/lib/whatsapp-bot/knowledge-menu";
import {
  delegationMenuFallbackText,
  delegateTaskPromptText,
  helpText,
  myTasksCompactFallbackText,
  taskCreatedReply,
  teamListText,
} from "@/lib/whatsapp-bot/menu";
import {
  getLeadCaptureGoogleFormUrl,
  leadCaptureGoogleFormReminderText,
  leadCaptureGoogleFormWelcomeText,
} from "@/lib/lead-capture-google-form";
import {
  buildWhatsAppUrl,
  whatsappDisplayNumber,
} from "@/app/site-content";
import { maybeAcknowledgeGoogleFormSubmission } from "@/lib/whatsapp-bot/google-form-acknowledge";
import {
  buildKnownLeadFields,
  isLeadCaptureFormStep,
  isLeadCaptureInquiry,
  leadCaptureBlockedMenuText,
  leadCaptureCompleteText,
  leadCaptureFollowUpText,
  leadCaptureWelcomeText,
  mergeLeadFormFields,
  parseLeadFormMessage,
  shouldRunLeadCapture,
  validateLeadFormFields,
  type LeadCaptureContact,
} from "@/lib/whatsapp-bot/lead-capture";
import {
  listMemberHints,
  resolveOrganizationByPhoneNumberId,
  resolveTeamMemberByPhone,
  type ResolvedWhatsAppTeamMember,
} from "@/lib/whatsapp-bot/resolve-org";
import {
  buildMyTasksList,
  buildTaskActionButtons,
  findTaskForMember,
  getPerformanceForMember,
  listActiveTasksForMember,
  parseTaskActionButtonId,
  parseTaskTextCommand,
  runTaskActionForMember,
  type WhatsAppTeamMember,
} from "@/lib/whatsapp-bot/task-user";
import { hasMinimumRole } from "@/lib/permissions";
import {
  sendWhatsAppInteractiveWithFallback,
  sendWhatsAppText,
} from "@/lib/whatsapp-bot/send";
import { recordWaInboundMessage, recordWaOutboundMessage, getWaContactByPhone, updateWaContactLeadCapture } from "@/lib/wa-inbox-store";
import {
  safeCustomerDisplayName,
  safeCustomerFirstName,
} from "@/lib/wa-safe-customer-name";

type MetaMessage = {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
  audio?: { id?: string; mime_type?: string };
  voice?: { id?: string; mime_type?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
};

export type MetaWebhookPayload = {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: MetaMessage[];
      };
    }[];
  }[];
};

function extractMessages(payload: MetaWebhookPayload): {
  phoneNumberId: string;
  messages: MetaMessage[];
} | null {
  const change = payload.entry?.[0]?.changes?.[0]?.value;
  const phoneNumberId = change?.metadata?.phone_number_id;
  const messages = change?.messages;

  if (!phoneNumberId || !messages?.length) {
    return null;
  }

  return { phoneNumberId, messages };
}

async function replyText(
  organizationId: string,
  toPhone: string,
  body: string,
  options?: {
    aiGenerated?: boolean;
    aiConfidence?: number;
    aiSourceTitles?: string[];
  },
) {
  const result = await sendWhatsAppText({ organizationId, toPhone, body });
  if (!result.sent) {
    console.error(
      "[whatsapp-bot] outbound text failed",
      result.reason,
      organizationId,
      toPhone.slice(-4),
    );
    return result;
  }
  await recordWaOutboundMessage({
    organizationId,
    toPhone,
    body,
    aiGenerated: options?.aiGenerated ?? false,
    aiConfidence: options?.aiConfidence ?? null,
    aiSourceTitles: options?.aiSourceTitles,
  });
  return result;
}

function extractInboundBody(message: MetaMessage) {
  if (message.type === "text" && message.text?.body) {
    return message.text.body.trim();
  }

  if (message.type === "interactive" && message.interactive) {
    const reply =
      message.interactive.button_reply ?? message.interactive.list_reply;
    return reply?.title?.trim() || reply?.id?.trim() || null;
  }

  return null;
}

async function captureInboundMessage(
  organizationId: string,
  message: MetaMessage,
  intent: string,
) {
  const body = extractInboundBody(message);
  if (!body) {
    return;
  }

  await recordWaInboundMessage({
    organizationId,
    fromPhone: message.from,
    externalId: message.id,
    body,
    messageType: message.type,
    intent,
  });
}

async function sendMainMenu(
  org: { id: string; name: string },
  toPhone: string,
  userName: string,
  role: import("@prisma/client").Role,
) {
  const items = sortKnowledgeMenuItems(await getKnowledgeMenuItems(org.id)).slice(
    0,
    6,
  );
  const fallbackText = delegationMenuFallbackText(userName, role);

  await sendWhatsAppInteractiveWithFallback({
    organizationId: org.id,
    toPhone,
    interactive: wrapInteractive(buildMainMenuList(userName, items, role)),
    fallbackText,
  });
}

async function sendMyTasksMenu(
  member: WhatsAppTeamMember,
  toPhone: string,
) {
  const tasks = await listActiveTasksForMember(member);
  const fallback = myTasksCompactFallbackText(member.role, tasks);

  if (tasks.length === 0) {
    await replyText(member.organizationId, toPhone, fallback);
    return;
  }

  if (tasks.length === 1) {
    const task = tasks[0];
    await sendWhatsAppInteractiveWithFallback({
      organizationId: member.organizationId,
      toPhone,
      interactive: wrapInteractive(buildTaskActionButtons(task.id, task.title)),
      fallbackText: fallback,
    });
    return;
  }

  const list = buildMyTasksList(member, tasks);
  if (list) {
    await sendWhatsAppInteractiveWithFallback({
      organizationId: member.organizationId,
      toPhone,
      interactive: wrapInteractive(list),
      fallbackText: fallback,
    });
    return;
  }

  await replyText(member.organizationId, toPhone, fallback);
}

async function sendPerformanceSummary(member: WhatsAppTeamMember, toPhone: string) {
  const text = await getPerformanceForMember(member);
  await replyText(member.organizationId, toPhone, text);
}

async function handleTaskButtonAction(
  member: WhatsAppTeamMember,
  action: ReturnType<typeof parseTaskActionButtonId>,
  ctx: {
    fromPhone: string;
    externalId: string;
    messageType: string;
  },
) {
  if (!action) {
    return false;
  }

  if (action.action === "pick") {
    const task = await findTaskForMember(member, action.taskId);
    if (!task) {
      await replyText(
        member.organizationId,
        ctx.fromPhone,
        "Task not found. Reply *my tasks* to see active work.",
      );
      return true;
    }

    await sendWhatsAppInteractiveWithFallback({
      organizationId: member.organizationId,
      toPhone: ctx.fromPhone,
      interactive: wrapInteractive(buildTaskActionButtons(task.id, task.title)),
      fallbackText: `Reply: start ${task.id.slice(0, 8)} | done ${task.id.slice(0, 8)} | help ${task.id.slice(0, 8)}`,
    });
    await markEvent(ctx.externalId, {
      organizationId: member.organizationId,
      fromPhone: ctx.fromPhone,
      messageType: ctx.messageType,
      status: "task_pick_sent",
      taskId: task.id,
    });
    return true;
  }

  const result = await runTaskActionForMember(
    member,
    action.action,
    action.taskId,
  );

  await markEvent(ctx.externalId, {
    organizationId: member.organizationId,
    fromPhone: ctx.fromPhone,
    messageType: ctx.messageType,
    status: result.ok ? `task_${action.action}` : "task_action_failed",
    taskId: action.taskId,
    error: result.ok ? undefined : result.message,
  });

  await replyText(member.organizationId, ctx.fromPhone, result.message);
  return true;
}

async function handleTaskTextCommand(
  member: WhatsAppTeamMember,
  command: ReturnType<typeof parseTaskTextCommand>,
  ctx: {
    fromPhone: string;
    externalId: string;
    messageType: string;
  },
) {
  if (!command) {
    return false;
  }

  if (command.kind === "my_tasks") {
    await markEvent(ctx.externalId, {
      organizationId: member.organizationId,
      fromPhone: ctx.fromPhone,
      messageType: ctx.messageType,
      status: "my_tasks_sent",
    });
    await sendMyTasksMenu(member, ctx.fromPhone);
    return true;
  }

  if (command.kind === "performance") {
    await markEvent(ctx.externalId, {
      organizationId: member.organizationId,
      fromPhone: ctx.fromPhone,
      messageType: ctx.messageType,
      status: "performance_sent",
    });
    await sendPerformanceSummary(member, ctx.fromPhone);
    return true;
  }

  const result = await runTaskActionForMember(
    member,
    command.action,
    command.shortId,
    command.note,
  );

  await markEvent(ctx.externalId, {
    organizationId: member.organizationId,
    fromPhone: ctx.fromPhone,
    messageType: ctx.messageType,
    status: result.ok ? `task_${command.action}` : "task_action_failed",
    error: result.ok ? undefined : result.message,
  });
  await replyText(member.organizationId, ctx.fromPhone, result.message);
  return true;
}

async function sendDelegatePrompt(organizationId: string, toPhone: string) {
  await sendWhatsAppInteractiveWithFallback({
    organizationId,
    toPhone,
    interactive: wrapInteractive(buildDelegatePromptButtons()),
    fallbackText: delegateTaskPromptText(),
  });
}

async function sendTeamList(organizationId: string, toPhone: string) {
  const members = await prisma.membership.findMany({
    where: { organizationId },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });

  await replyText(
    organizationId,
    toPhone,
    teamListText(
      members.map((m) => ({
        name: m.user.name ?? m.user.email.split("@")[0],
        phoneFormatted:
          formatWhatsAppPhone(m.user.phone) === "-"
            ? null
            : formatWhatsAppPhone(m.user.phone),
      })),
    ),
  );
}

async function touchInboundActivity(organizationId: string) {
  await prisma.workspaceWhatsAppSettings.updateMany({
    where: { organizationId },
    data: { lastInboundAt: new Date() },
  });
}

async function isBotLive(organizationId: string) {
  const settings = await prisma.workspaceWhatsAppSettings.findUnique({
    where: { organizationId },
    select: { botLiveAt: true },
  });

  return Boolean(settings?.botLiveAt);
}

async function markEvent(
  externalId: string,
  data: {
    organizationId?: string;
    fromPhone: string;
    messageType: string;
    status: string;
    error?: string;
    taskId?: string;
  },
) {
  await prisma.whatsAppInboundEvent.upsert({
    where: { externalId },
    create: {
      externalId,
      organizationId: data.organizationId,
      fromPhone: data.fromPhone,
      messageType: data.messageType,
      status: data.status,
      error: data.error,
      taskId: data.taskId,
      processedAt: new Date(),
    },
    update: {
      status: data.status,
      error: data.error,
      taskId: data.taskId,
      processedAt: new Date(),
    },
  });
}

async function handleMenuAction(
  actionId: WaMenuActionId,
  ctx: {
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    fromPhone: string;
    userName: string;
    userId: string;
    role: import("@prisma/client").Role;
    externalId: string;
    messageType: string;
  },
) {
  const org = { id: ctx.organizationId, name: ctx.organizationName };
  const member: WhatsAppTeamMember = {
    organizationId: ctx.organizationId,
    organizationName: ctx.organizationName,
    organizationSlug: ctx.organizationSlug,
    userId: ctx.userId,
    userName: ctx.userName,
    role: ctx.role,
    phone: ctx.fromPhone,
  };

  switch (actionId) {
    case WA_MENU.DELEGATE_TASK:
      if (!hasMinimumRole(ctx.role, "MANAGER")) {
        await replyText(
          ctx.organizationId,
          ctx.fromPhone,
          "Only managers can assign tasks. Reply *my tasks* to see your work.",
        );
        return;
      }
      await markEvent(ctx.externalId, {
        organizationId: ctx.organizationId,
        fromPhone: ctx.fromPhone,
        messageType: ctx.messageType,
        status: "delegate_prompt_sent",
      });
      await sendDelegatePrompt(ctx.organizationId, ctx.fromPhone);
      return;
    case WA_MENU.MY_TASKS:
      await markEvent(ctx.externalId, {
        organizationId: ctx.organizationId,
        fromPhone: ctx.fromPhone,
        messageType: ctx.messageType,
        status: "my_tasks_sent",
      });
      await sendMyTasksMenu(member, ctx.fromPhone);
      return;
    case WA_MENU.TEAM_PERFORMANCE:
      await markEvent(ctx.externalId, {
        organizationId: ctx.organizationId,
        fromPhone: ctx.fromPhone,
        messageType: ctx.messageType,
        status: "performance_sent",
      });
      await sendPerformanceSummary(member, ctx.fromPhone);
      return;
    case WA_MENU.TEAM_LIST:
      if (!hasMinimumRole(ctx.role, "MANAGER")) {
        await replyText(ctx.organizationId, ctx.fromPhone, "Reply *my tasks* to see your assigned work.");
        return;
      }
      await markEvent(ctx.externalId, {
        organizationId: ctx.organizationId,
        fromPhone: ctx.fromPhone,
        messageType: ctx.messageType,
        status: "team_list_sent",
      });
      await sendTeamList(ctx.organizationId, ctx.fromPhone);
      return;
    case WA_MENU.HELP:
      await markEvent(ctx.externalId, {
        organizationId: ctx.organizationId,
        fromPhone: ctx.fromPhone,
        messageType: ctx.messageType,
        status: "help_sent",
      });
      await replyText(ctx.organizationId, ctx.fromPhone, helpText(ctx.role));
      return;
    case WA_MENU.BROWSE_TOPICS:
      await markEvent(ctx.externalId, {
        organizationId: ctx.organizationId,
        fromPhone: ctx.fromPhone,
        messageType: ctx.messageType,
        status: "kb_menu_sent",
      });
      await sendCustomerKnowledgeMenu(org, ctx.fromPhone);
      return;
    case WA_MENU.MAIN_MENU:
      await markEvent(ctx.externalId, {
        organizationId: ctx.organizationId,
        fromPhone: ctx.fromPhone,
        messageType: ctx.messageType,
        status: "menu_sent",
      });
      await sendMainMenu(org, ctx.fromPhone, ctx.userName, ctx.role);
      return;
    default:
      await replyText(
        ctx.organizationId,
        ctx.fromPhone,
        "Unknown menu option. Reply menu to try again.",
      );
  }
}

function parseMenuAction(message: MetaMessage): WaMenuActionId | null {
  if (message.type !== "interactive" || !message.interactive) {
    return null;
  }

  const reply =
    message.interactive.button_reply ?? message.interactive.list_reply;
  const id = reply?.id;

  if (
    id === WA_MENU.DELEGATE_TASK ||
    id === WA_MENU.MY_TASKS ||
    id === WA_MENU.TEAM_PERFORMANCE ||
    id === WA_MENU.TEAM_LIST ||
    id === WA_MENU.HELP ||
    id === WA_MENU.MAIN_MENU ||
    id === WA_MENU.BROWSE_TOPICS
  ) {
    return id;
  }

  return null;
}

function parseInteractiveTaskAction(message: MetaMessage) {
  if (message.type !== "interactive" || !message.interactive) {
    return null;
  }

  const reply =
    message.interactive.button_reply ?? message.interactive.list_reply;
  return parseTaskActionButtonId(reply?.id);
}

function mapTextShortcut(
  command: string,
  role: import("@prisma/client").Role,
): WaMenuActionId | null {
  if (isWhatsAppMenuCommand(command)) {
    return WA_MENU.MAIN_MENU;
  }

  const normalized = normalizeWhatsAppCommand(command);

  const isManager = hasMinimumRole(role, "MANAGER");

  if (isManager) {
    if (
      normalized === "1" ||
      normalized === "delegate" ||
      normalized === "assign" ||
      normalized === "task"
    ) {
      return WA_MENU.DELEGATE_TASK;
    }
    if (
      normalized === "2" ||
      normalized === "my tasks" ||
      normalized === "tasks" ||
      normalized === "mytasks"
    ) {
      return WA_MENU.MY_TASKS;
    }
    if (
      normalized === "3" ||
      normalized === "performance" ||
      normalized === "stats" ||
      normalized === "report"
    ) {
      return WA_MENU.TEAM_PERFORMANCE;
    }
    if (normalized === "4" || normalized === "team" || normalized === "members") {
      return WA_MENU.TEAM_LIST;
    }
    if (normalized === "5" || normalized === "help") {
      return WA_MENU.HELP;
    }
    if (normalized === "6" || normalized === "topics" || normalized === "videos") {
      return WA_MENU.BROWSE_TOPICS;
    }
  } else {
    if (
      normalized === "1" ||
      normalized === "my tasks" ||
      normalized === "tasks" ||
      normalized === "mytasks"
    ) {
      return WA_MENU.MY_TASKS;
    }
    if (
      normalized === "2" ||
      normalized === "performance" ||
      normalized === "stats" ||
      normalized === "report"
    ) {
      return WA_MENU.TEAM_PERFORMANCE;
    }
    if (normalized === "3" || normalized === "help") {
      return WA_MENU.HELP;
    }
    if (normalized === "4" || normalized === "topics" || normalized === "videos") {
      return WA_MENU.BROWSE_TOPICS;
    }
  }

  return null;
}

async function sendCustomerKnowledgeMenu(
  org: { id: string; name: string },
  toPhone: string,
) {
  const items = sortKnowledgeMenuItems(await getKnowledgeMenuItems(org.id)).slice(
    0,
    10,
  );

  if (items.length === 0) {
    await replyText(
      org.id,
      toPhone,
      customerKnowledgeMenuFallback(org.name, items),
    );
    return;
  }

  const sent = await sendWhatsAppInteractiveWithFallback({
    organizationId: org.id,
    toPhone,
    interactive: wrapInteractive(buildCustomerKnowledgeMenu(org.name, items)),
    fallbackText: customerKnowledgeMenuFallback(org.name, items),
  });

  if (sent.sent) {
    await recordWaOutboundMessage({
      organizationId: org.id,
      toPhone,
      body: `[Menu] ${items.length} training topic(s)`,
      aiGenerated: false,
    });
  }
}

async function sendCustomerFollowUpButtons(organizationId: string, toPhone: string) {
  await sendWhatsAppInteractiveWithFallback({
    organizationId,
    toPhone,
    interactive: wrapInteractive(buildCustomerFollowUpButtons()),
    fallbackText:
      "Reply *menu* to browse topics, or type your next question.",
  });
}

async function loadLeadCaptureContact(organizationId: string, fromPhone: string) {
  return getWaContactByPhone(organizationId, fromPhone);
}

async function promptIncompleteLeadCapture(
  org: { id: string; name: string },
  toPhone: string,
  contact: LeadCaptureContact,
) {
  const formUrl = await getLeadCaptureGoogleFormUrl(org.id);
  const text = formUrl
    ? leadCaptureGoogleFormReminderText(formUrl)
    : leadCaptureBlockedMenuText(org.name, contact.phone, contact);
  await replyText(org.id, toPhone, text);
  if (formUrl) {
    await updateWaContactLeadCapture({
      contactId: contact.id,
      organizationId: org.id,
      step: "COMPLETE",
      complete: true,
    });
    return;
  }
  if (contact.leadCaptureStep === "PENDING") {
    await updateWaContactLeadCapture({
      contactId: contact.id,
      organizationId: org.id,
      step: "FORM",
    });
  }
}

async function savePartialLeadForm(
  orgId: string,
  contact: LeadCaptureContact,
  fields: Partial<{
    name: string;
    email: string;
    city: string;
    requirementDescription: string;
  }>,
) {
  await updateWaContactLeadCapture({
    contactId: contact.id,
    organizationId: orgId,
    step: "FORM",
    data: fields,
  });
}

async function maybeLeadCaptureKnowledgePrefix(
  org: { id: string; name: string },
  customerMessage: string,
  contactName: string | null | undefined,
  parsedFieldCount: number,
): Promise<string> {
  if (parsedFieldCount > 0 || !isLeadCaptureInquiry(customerMessage)) {
    return "";
  }
  if (!(await isBotLive(org.id))) {
    return "";
  }

  try {
    const reply = await generateKnowledgeReply({
      organizationId: org.id,
      organizationName: org.name,
      customerMessage: customerMessage.trim(),
      customerName: safeCustomerDisplayName(contactName),
    });
    return `${reply.text.trim()}\n\n`;
  } catch {
    return "";
  }
}

async function maybeAcknowledgeFormResponse(
  org: { id: string; name: string },
  message: MetaMessage,
  contact: LeadCaptureContact | null,
  customerMessage: string | null,
): Promise<boolean> {
  if (!contact?.leadCaptureComplete || contact.googleFormAckSentAt) {
    return false;
  }

  const acked = await maybeAcknowledgeGoogleFormSubmission({
    organizationId: org.id,
    organizationName: org.name,
    fromPhone: message.from,
    contactId: contact.id,
    sendReply: async (text) => {
      await replyText(org.id, message.from, text);
    },
  });

  if (!acked) {
    return false;
  }

  await markEvent(message.id, {
    organizationId: org.id,
    fromPhone: message.from,
    messageType: message.type,
    status: "google_form_ack_sent",
  });

  if (customerMessage?.trim() && isLeadCaptureInquiry(customerMessage)) {
    return false;
  }

  return true;
}

async function maybeHandleLeadCapture(
  org: { id: string; name: string },
  message: MetaMessage,
  contact: LeadCaptureContact,
  customerMessage: string | null,
): Promise<boolean> {
  if (contact.leadCaptureComplete) {
    return false;
  }

  // Prefer Google Form when configured — one prompt, then AI is unblocked.
  const formUrl = await getLeadCaptureGoogleFormUrl(org.id);
  if (formUrl) {
    const isFirstPrompt = contact.leadCaptureStep === "PENDING";
    const formText = isFirstPrompt
      ? leadCaptureGoogleFormWelcomeText(org.name, contact.phone, formUrl)
      : leadCaptureGoogleFormReminderText(formUrl);
    const knowledgePrefix = customerMessage?.trim()
      ? await maybeLeadCaptureKnowledgePrefix(
          org,
          customerMessage,
          contact.name,
          0,
        )
      : "";

    await replyText(
      org.id,
      message.from,
      knowledgePrefix ? `${knowledgePrefix}${formText}` : formText,
      knowledgePrefix ? { aiGenerated: true, aiSourceTitles: [] } : undefined,
    );
    await updateWaContactLeadCapture({
      contactId: contact.id,
      organizationId: org.id,
      step: "COMPLETE",
      complete: true,
    });
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: isFirstPrompt
        ? "lead_capture_google_form_sent"
        : "lead_capture_google_form_reminder",
    });
    return true;
  }

  if (!shouldRunLeadCapture(contact)) {
    return false;
  }

  if (contact.leadCaptureStep === "PENDING") {
    await replyText(
      org.id,
      message.from,
      leadCaptureWelcomeText(org.name, contact.phone),
    );
    await updateWaContactLeadCapture({
      contactId: contact.id,
      organizationId: org.id,
      step: "FORM",
    });
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "lead_capture_form_sent",
    });
    return true;
  }

  if (!isLeadCaptureFormStep(contact.leadCaptureStep)) {
    return false;
  }

  if (!customerMessage?.trim()) {
    await replyText(
      org.id,
      message.from,
      "Please send a text reply with the details we requested.",
    );
    return true;
  }

  const known = buildKnownLeadFields(contact);
  const { missingKeys: currentMissing } = validateLeadFormFields(known);
  const parsed = parseLeadFormMessage(customerMessage, known, {
    missingKeys: currentMissing,
  });
  const merged = mergeLeadFormFields(contact, parsed);
  const { validated, missingKeys } = validateLeadFormFields(merged);
  const knowledgePrefix = await maybeLeadCaptureKnowledgePrefix(
    org,
    customerMessage,
    validated.name ?? contact.name,
    Object.keys(parsed).length,
  );

  if (missingKeys.length > 0) {
    await savePartialLeadForm(org.id, contact, {
      name: validated.name,
      email: validated.email,
      city: validated.city,
      requirementDescription: validated.requirement,
    });
    await replyText(
      org.id,
      message.from,
      knowledgePrefix + leadCaptureFollowUpText(validated, missingKeys, org.name),
      knowledgePrefix ? { aiGenerated: true, aiSourceTitles: [] } : undefined,
    );
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "lead_capture_form_incomplete",
    });
    return true;
  }

  await updateWaContactLeadCapture({
    contactId: contact.id,
    organizationId: org.id,
    step: "COMPLETE",
    complete: true,
    data: {
      name: validated.name,
      email: validated.email,
      city: validated.city,
      requirementDescription: validated.requirement,
    },
  });
  await replyText(
    org.id,
    message.from,
    leadCaptureCompleteText(org.name, validated.name),
  );
  if (await isBotLive(org.id)) {
    await sendCustomerKnowledgeMenu(org, message.from);
  }
  await markEvent(message.id, {
    organizationId: org.id,
    fromPhone: message.from,
    messageType: message.type,
    status: "lead_capture_complete",
  });
  return true;
}

async function handleCustomerKnowledgeSelection(
  org: { id: string; name: string },
  message: MetaMessage,
  itemId: string,
) {
  const item = await getKnowledgeItemForOrg(org.id, itemId);
  if (!item) {
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "kb_item_missing",
    });
    await replyText(
      org.id,
      message.from,
      "That topic is no longer available. Reply *menu* to see updated options.",
    );
    await sendCustomerKnowledgeMenu(org, message.from);
    return;
  }

  await captureInboundMessage(org.id, message, "Lead");
  await replyText(org.id, message.from, formatKnowledgeItemReply(item), {
    aiGenerated: true,
    aiConfidence: 1,
    aiSourceTitles: [item.title],
  });
  await markEvent(message.id, {
    organizationId: org.id,
    fromPhone: message.from,
    messageType: message.type,
    status: "kb_menu_answered",
  });
  await sendCustomerFollowUpButtons(org.id, message.from);
}

async function handleCustomerMenuAction(
  org: { id: string; name: string },
  message: MetaMessage,
  action: WaCustomerMenuActionId,
) {
  await captureInboundMessage(org.id, message, "Lead");

  switch (action) {
    case WA_CUSTOMER_MENU.BROWSE_TOPICS:
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "kb_menu_sent",
      });
      await replyText(
        org.id,
        message.from,
        `Hi! How can we help you today? Pick a topic below, or type your question.`,
      );
      await sendCustomerKnowledgeMenu(org, message.from);
      return;
    case WA_CUSTOMER_MENU.ASK_QUESTION:
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "kb_ask_prompt",
      });
      await replyText(org.id, message.from, customerAskPromptText());
      return;
    case WA_CUSTOMER_MENU.HUMAN_HELP:
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "kb_human_handoff",
      });
      await replyText(org.id, message.from, customerHumanHelpText(org.name));
      return;
    default:
      await replyText(org.id, message.from, "Reply *menu* to browse topics.");
  }
}

async function handleCustomerMessage(
  org: { id: string; name: string },
  message: MetaMessage,
) {
  const botLive = await isBotLive(org.id);
  const phone = normalizeWhatsAppPhone(message.from);
  let contact = phone ? await loadLeadCaptureContact(org.id, message.from) : null;
  const capturePending = contact ? shouldRunLeadCapture(contact) : false;

  if (!botLive) {
    if (message.type === "text" || message.type === "interactive") {
      await captureInboundMessage(org.id, message, "Lead");
    }
    contact = phone ? await loadLeadCaptureContact(org.id, message.from) : contact;

    if (contact && !contact.leadCaptureComplete) {
      let customerMessage = extractInboundBody(message);
      if (
        !customerMessage &&
        (message.type === "audio" || message.type === "voice")
      ) {
        customerMessage = await transcribeCustomerAudio(org.id, message);
        if (customerMessage) {
          await recordWaInboundMessage({
            organizationId: org.id,
            fromPhone: message.from,
            externalId: message.id,
            body: customerMessage,
            messageType: message.type,
            intent: "Lead",
          });
        }
      }

      const handled = await maybeHandleLeadCapture(
        org,
        message,
        contact,
        customerMessage,
      );
      if (handled) {
        return;
      }
    }

    contact = phone ? await loadLeadCaptureContact(org.id, message.from) : contact;
    if (
      await maybeAcknowledgeFormResponse(org, message, contact, extractInboundBody(message))
    ) {
      return;
    }

    const offlineBody = extractInboundBody(message)?.trim();
    if (offlineBody) {
      const offlineReply = isWhatsAppMenuCommand(offlineBody)
        ? [
            `Hi! Thanks for messaging *${org.name}*.`,
            "",
            "Our WhatsApp AI is not live yet. A team member will reply here soon.",
            "",
            "For *Task* on WhatsApp: save your mobile number in Sheetomatic *Team* settings, then reply *menu* from that number.",
          ].join("\n")
        : `Thanks for messaging *${org.name}*. Our team will get back to you shortly.`;
      await replyText(org.id, message.from, offlineReply);
    }

    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "lead_captured",
      error: "WhatsApp AI not live",
    });
    return;
  }

  if (capturePending) {
    const knowledgeItemId = parseKnowledgeItemId(message);
    const customerMenuAction = parseCustomerMenuAction(message);

    if (knowledgeItemId || customerMenuAction || message.type === "interactive") {
      await captureInboundMessage(org.id, message, "Lead");
      contact = phone ? await loadLeadCaptureContact(org.id, message.from) : contact;
      if (contact) {
        await promptIncompleteLeadCapture(org, message.from, contact);
      }
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "lead_capture_blocked_menu",
      });
      return;
    }
  }

  const knowledgeItemId = parseKnowledgeItemId(message);
  if (knowledgeItemId) {
    await handleCustomerKnowledgeSelection(org, message, knowledgeItemId);
    return;
  }

  const customerMenuAction = parseCustomerMenuAction(message);
  if (customerMenuAction) {
    await handleCustomerMenuAction(org, message, customerMenuAction);
    return;
  }

  if (message.type === "interactive") {
    await captureInboundMessage(org.id, message, "Lead");
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "lead_menu_ignored",
    });
    await sendCustomerKnowledgeMenu(org, message.from);
    return;
  }

  let customerMessage: string | null = extractInboundBody(message);

  if (
    !customerMessage &&
    (message.type === "audio" ||
      message.type === "voice" ||
      message.audio?.id ||
      message.voice?.id)
  ) {
    customerMessage = await transcribeCustomerAudio(org.id, message);
    if (!customerMessage) {
      await replyText(
        org.id,
        message.from,
        "We couldn't hear that clearly. Please type your message, or reply *menu* to browse topics.",
      );
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "lead_audio_failed",
        error: "Transcription failed",
      });
      return;
    }

    await recordWaInboundMessage({
      organizationId: org.id,
      fromPhone: message.from,
      externalId: message.id,
      body: customerMessage,
      messageType: message.type,
      intent: "Lead",
    });
  } else if (message.type === "text" || customerMessage) {
    await captureInboundMessage(org.id, message, "Lead");
  } else {
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "unsupported",
      error: `Unsupported customer type: ${message.type}`,
    });
    await replyText(
      org.id,
      message.from,
      "Please send a text message, or reply *menu* to browse topics.",
    );
    return;
  }

  if (!customerMessage?.trim()) {
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "lead_empty",
    });
    await replyText(
      org.id,
      message.from,
      "Please type a message, or reply *menu* to browse topics.",
    );
    return;
  }

  contact = phone ? await loadLeadCaptureContact(org.id, message.from) : contact;
  if (contact && !contact.leadCaptureComplete) {
    const handled = await maybeHandleLeadCapture(
      org,
      message,
      contact,
      customerMessage,
    );
    if (handled) {
      return;
    }
  }

  contact = phone ? await loadLeadCaptureContact(org.id, message.from) : contact;
  if (
    await maybeAcknowledgeFormResponse(org, message, contact, customerMessage)
  ) {
    return;
  }

  const waContact = phone
    ? await prisma.waContact.findUnique({
        where: {
          organizationId_phone: { organizationId: org.id, phone },
        },
        select: { aiEnabled: true, name: true },
      })
    : null;

  if (waContact && !waContact.aiEnabled) {
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "lead_human_only",
    });
    await replyText(
      org.id,
      message.from,
      isWhatsAppMenuCommand(customerMessage)
        ? `Hi! A team member will reply here shortly. Reply *menu* to browse topics while you wait.`
        : "Thanks for your message. A team member will reply here shortly.",
    );
    return;
  }

  const command = normalizeWhatsAppCommand(customerMessage.trim());
  const customerShortcut = mapCustomerTextShortcut(command);
  if (customerShortcut) {
    await handleCustomerMenuAction(org, message, customerShortcut);
    return;
  }

  if (isWhatsAppGreeting(customerMessage)) {
    const greetingName = safeCustomerFirstName(waContact?.name);
    await replyText(
      org.id,
      message.from,
      `Hi${greetingName ? ` ${greetingName}` : ""}! How can we help you today? Reply *menu* to browse topics.`,
    );
    await sendCustomerKnowledgeMenu(org, message.from);
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "kb_menu_sent",
    });
    return;
  }

  const menuItems = sortKnowledgeMenuItems(await getKnowledgeMenuItems(org.id)).slice(
    0,
    10,
  );
  const numericPick = Number.parseInt(command, 10);
  if (
    Number.isInteger(numericPick) &&
    numericPick >= 1 &&
    numericPick <= menuItems.length
  ) {
    await handleCustomerKnowledgeSelection(
      org,
      message,
      menuItems[numericPick - 1].id,
    );
    return;
  }

  try {
    const reply = await generateKnowledgeReply({
      organizationId: org.id,
      organizationName: org.name,
      customerMessage: customerMessage.trim(),
      customerName: safeCustomerDisplayName(waContact?.name),
    });

    await replyText(org.id, message.from, reply.text, {
      aiGenerated: true,
      aiConfidence: reply.confidence,
      aiSourceTitles: reply.sourceTitles,
    });

    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: reply.handoff ? "ai_handoff" : "ai_replied",
    });

    await sendCustomerFollowUpButtons(org.id, message.from);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "AI reply failed";
    await markEvent(message.id, {
      organizationId: org.id,
      fromPhone: message.from,
      messageType: message.type,
      status: "failed",
      error: raw,
    });
    await replyText(
      org.id,
      message.from,
      "Thanks for your message. Our team will get back to you shortly.",
    );
  }
}

async function transcribeCustomerAudio(
  organizationId: string,
  message: MetaMessage,
): Promise<string | null> {
  const mediaId = message.audio?.id ?? message.voice?.id;
  const mimeType =
    message.audio?.mime_type ?? message.voice?.mime_type ?? "audio/ogg";

  if (!mediaId) {
    await markEvent(message.id, {
      organizationId,
      fromPhone: message.from,
      messageType: message.type,
      status: "failed",
      error: "Missing media id",
    });
    return null;
  }

  const media = await downloadWhatsAppMedia({
    organizationId,
    mediaId,
  });

  if (!media) {
    await captureInboundMessage(organizationId, message, "Lead");
    await markEvent(message.id, {
      organizationId,
      fromPhone: message.from,
      messageType: message.type,
      status: "lead_captured",
      error: "Could not download voice note",
    });
    return null;
  }

  try {
    return await transcribeAudioBuffer(media.buffer, mimeType);
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Transcription failed";
    await captureInboundMessage(organizationId, message, "Lead");
    await markEvent(message.id, {
      organizationId,
      fromPhone: message.from,
      messageType: message.type,
      status: "lead_captured",
      error: raw,
    });
    return null;
  }
}

async function processSingleMessage(
  phoneNumberId: string,
  message: MetaMessage,
) {
  const existing = await prisma.whatsAppInboundEvent.findUnique({
    where: { externalId: message.id },
  });
  if (existing?.processedAt) {
    return;
  }

  const org = await resolveOrganizationByPhoneNumberId(phoneNumberId);
  if (!org) {
    await markEvent(message.id, {
      fromPhone: message.from,
      messageType: message.type,
      status: "unknown_phone_number_id",
      error: `No org mapped to phone_number_id ${phoneNumberId}`,
    });
    return;
  }

  await touchInboundActivity(org.id);

  const delegator = await resolveTeamMemberByPhone(org.id, message.from);
  if (!delegator) {
    // Official Cloud line: team phones get the workspace bot; everyone else is
    // redirected to the communication WhatsApp / enquiry form.
    await handleNonTeamOfficialRedirect(org, message);
    return;
  }

  await handleTeamMemberMessage(org, delegator, message);
}

/** Non-team senders on Official API — CTA buttons to communication WhatsApp / form. */
async function handleNonTeamOfficialRedirect(
  org: { id: string; name: string },
  message: MetaMessage,
) {
  await captureInboundMessage(org.id, message, "Lead");

  const formUrl = await getLeadCaptureGoogleFormUrl(org.id);
  const chatLink = buildWhatsAppUrl(
    "Hi Sheetomatic, I want to enquire about your products.",
  );
  const bodyText = [
    `Hi! Thanks for messaging *${org.name}* on our Official WhatsApp.`,
    "",
    "This number is for *registered workspace team members* only.",
    "",
    `Tap below to chat with us on *${whatsappDisplayNumber}*, or use the enquiry form.`,
  ].join("\n");

  const fallbackLines = [
    bodyText,
    "",
    `Chat: ${chatLink}`,
  ];
  if (formUrl) {
    fallbackLines.push(`Form: ${formUrl}`);
  }
  fallbackLines.push("", "— Team Sheetomatic");
  const fallbackText = fallbackLines.join("\n");

  const chatSent = await sendWhatsAppInteractiveWithFallback({
    organizationId: org.id,
    toPhone: message.from,
    interactive: wrapInteractive(
      buildCtaUrlInteractive({
        body: bodyText,
        buttonLabel: "Chat on WhatsApp",
        url: chatLink,
        footer: "Team members: reply menu here",
      }),
    ),
    fallbackText,
  });

  if (chatSent.sent && formUrl) {
    await sendWhatsAppInteractiveWithFallback({
      organizationId: org.id,
      toPhone: message.from,
      interactive: wrapInteractive(
        buildCtaUrlInteractive({
          body: "Prefer a form? Share your details here and our team will get back to you.",
          buttonLabel: "Enquiry form",
          url: formUrl,
        }),
      ),
      fallbackText: `Enquiry form: ${formUrl}`,
    });
  }

  await markEvent(message.id, {
    organizationId: org.id,
    fromPhone: message.from,
    messageType: message.type,
    status: "redirected_to_communication",
  });
}

async function handleTeamMemberMessage(
  org: { id: string; name: string },
  member: ResolvedWhatsAppTeamMember,
  message: MetaMessage,
) {
  if (message.type !== "audio" && message.type !== "voice") {
    await captureInboundMessage(org.id, message, "Team");
  }

  const knowledgeItemId = parseKnowledgeItemId(message);
  if (knowledgeItemId) {
    await handleCustomerKnowledgeSelection(org, message, knowledgeItemId);
    return;
  }

  const taskAction = parseInteractiveTaskAction(message);
  if (taskAction) {
    await handleTaskButtonAction(member, taskAction, {
      fromPhone: message.from,
      externalId: message.id,
      messageType: message.type,
    });
    return;
  }

  const menuAction = parseMenuAction(message);
  if (menuAction) {
    await handleMenuAction(menuAction, {
      organizationId: org.id,
      organizationName: org.name,
      organizationSlug: member.organizationSlug,
      fromPhone: message.from,
      userName: member.userName,
      userId: member.userId,
      role: member.role,
      externalId: message.id,
      messageType: message.type,
    });
    return;
  }

  if (message.type === "text" && message.text?.body) {
    const rawText = message.text.body.trim();

    if (isWhatsAppMenuCommand(rawText)) {
      await handleMenuAction(WA_MENU.MAIN_MENU, {
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: member.organizationSlug,
        fromPhone: message.from,
        userName: member.userName,
        userId: member.userId,
        role: member.role,
        externalId: message.id,
        messageType: message.type,
      });
      return;
    }

    const command = normalizeWhatsAppCommand(rawText);
    const taskCommand = parseTaskTextCommand(rawText);
    if (
      await handleTaskTextCommand(member, taskCommand, {
        fromPhone: message.from,
        externalId: message.id,
        messageType: message.type,
      })
    ) {
      return;
    }

    const shortcut = mapTextShortcut(command, member.role);

    if (shortcut) {
      await handleMenuAction(shortcut, {
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: member.organizationSlug,
        fromPhone: message.from,
        userName: member.userName,
        userId: member.userId,
        role: member.role,
        externalId: message.id,
        messageType: message.type,
      });
      return;
    }

    if (!hasMinimumRole(member.role, "MANAGER")) {
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "staff_hint",
      });
      await replyText(
        org.id,
        message.from,
        "Reply *my tasks*, *performance*, or *menu*. Update with: start/done/help <task-id>",
      );
      return;
    }

    if (command.length < 8) {
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "too_short",
      });
      await replyText(
        org.id,
        message.from,
        isWhatsAppGreeting(rawText)
          ? delegationMenuFallbackText(member.userName, member.role)
          : "Add a few more words to assign a task, send a voice note, or reply *menu*.",
      );
      return;
    }

    await runTaskPipeline(member, {
      fromPhone: message.from,
      externalId: message.id,
      messageType: message.type,
      instruction: rawText,
    });
    return;
  }

  if (
    message.type === "audio" ||
    message.type === "voice" ||
    message.audio?.id ||
    message.voice?.id
  ) {
    if (!hasMinimumRole(member.role, "MANAGER")) {
      await replyText(
        org.id,
        message.from,
        "Voice assignment is for managers. Reply *my tasks* to update your work.",
      );
      return;
    }

    const mediaId = message.audio?.id ?? message.voice?.id;
    const mimeType =
      message.audio?.mime_type ?? message.voice?.mime_type ?? "audio/ogg";

    if (!mediaId) {
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "failed",
        error: "Missing media id",
      });
      return;
    }

    const media = await downloadWhatsAppMedia({
      organizationId: org.id,
      mediaId,
    });

    if (!media) {
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "failed",
        error: "Could not download voice note",
      });
      await replyText(
        org.id,
        message.from,
        "Could not read the voice note. Please try again in a moment, or send the task as a text message.",
      );
      return;
    }

    let instruction: string;
    try {
      instruction = await transcribeAudioBuffer(media.buffer, mimeType);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Transcription failed";
      await markEvent(message.id, {
        organizationId: org.id,
        fromPhone: message.from,
        messageType: message.type,
        status: "failed",
        error: raw,
      });
      await replyText(org.id, message.from, mapOpenAiServiceError(raw));
      return;
    }

    await recordWaInboundMessage({
      organizationId: org.id,
      fromPhone: message.from,
      externalId: message.id,
      body: instruction,
      messageType: message.type,
      intent: "Team",
    });

    await runTaskPipeline(member, {
      fromPhone: message.from,
      externalId: message.id,
      messageType: message.type,
      instruction,
    });
    return;
  }

  await markEvent(message.id, {
    organizationId: org.id,
    fromPhone: message.from,
    messageType: message.type,
    status: "unsupported",
    error: `Unsupported type: ${message.type}`,
  });
  await replyText(
    org.id,
    message.from,
    hasMinimumRole(member.role, "MANAGER")
      ? "Send a voice note or text to assign a task. Reply *menu* for all options."
      : "Reply *my tasks*, *performance*, or *menu* to manage your work.",
  );
}

async function runTaskPipeline(
  delegator: ResolvedWhatsAppTeamMember,
  params: {
    fromPhone: string;
    externalId: string;
    messageType: string;
    instruction: string;
  },
) {
  const instruction = params.instruction.trim();
  if (isWhatsAppGreeting(instruction) || instruction.length < 8) {
    await markEvent(params.externalId, {
      organizationId: delegator.organizationId,
      fromPhone: params.fromPhone,
      messageType: params.messageType,
      status: "menu_sent",
    });
    await sendMainMenu(
      { id: delegator.organizationId, name: delegator.organizationName },
      params.fromPhone,
      delegator.userName,
      delegator.role,
    );
    return;
  }

  const members = await listMemberHints(delegator.organizationId);

  let draft;
  try {
    ({ draft } = await parseTaskFromInstruction(instruction, members));
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Parse failed";
    await markEvent(params.externalId, {
      organizationId: delegator.organizationId,
      fromPhone: params.fromPhone,
      messageType: params.messageType,
      status: "failed",
      error: raw,
    });
    await replyText(
      delegator.organizationId,
      params.fromPhone,
      mapOpenAiServiceError(raw.replace(/^OPENAI_ERROR:/, "")),
    );
    return;
  }

  const result = await createDelegatedTaskFromDraft({
    organizationId: delegator.organizationId,
    organizationName: delegator.organizationName,
    createdById: delegator.userId,
    draft,
    notifyAssignee: true,
  });

  if (!result.ok) {
    await markEvent(params.externalId, {
      organizationId: delegator.organizationId,
      fromPhone: params.fromPhone,
      messageType: params.messageType,
      status: "failed",
      error: result.error,
    });
    await replyText(delegator.organizationId, params.fromPhone, result.error);
    return;
  }

  await markEvent(params.externalId, {
    organizationId: delegator.organizationId,
    fromPhone: params.fromPhone,
    messageType: params.messageType,
    status: "task_created",
    taskId: result.taskId,
  });

  const summary = taskCreatedReply({
    title: result.title,
    assigneeName: result.assigneeName,
    dueLabel: formatTaskDue(result.dueAt),
    taskId: result.taskId,
    whatsappSent: result.whatsappSent,
  });

  await replyText(delegator.organizationId, params.fromPhone, summary);

  await sendWhatsAppInteractiveWithFallback({
    organizationId: delegator.organizationId,
    toPhone: params.fromPhone,
    interactive: wrapInteractive(buildPostTaskButtons()),
    fallbackText: "Reply 1 to delegate another task, or menu for all options.",
  });
}

export async function handleWhatsAppWebhook(payload: MetaWebhookPayload) {
  const extracted = extractMessages(payload);
  if (!extracted) {
    return;
  }

  for (const message of extracted.messages) {
    await processSingleMessage(extracted.phoneNumberId, message);
  }
}
