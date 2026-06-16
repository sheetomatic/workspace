import { sendFmsStepReminderWhatsApp } from "@/lib/integrations/whatsapp";
import { parseAlertConfig, type FmsAlertConfig } from "@/lib/fms/constants";

export type FmsReminderKind =
  | "assign"
  | "due_coming"
  | "same_day"
  | "overdue";

type Assignee = {
  name: string | null;
  email: string;
  phone: string | null;
};

function formatPlannedDate(plannedAt: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(plannedAt);
}

function buildMessageBody(params: {
  kind: FmsReminderKind;
  referenceLabel: string;
  stepName: string;
  plannedAt: Date | null;
  assigneeName: string;
  organizationName: string;
  dueComingDaysBefore?: number;
}) {
  const plannedLabel = params.plannedAt
    ? formatPlannedDate(params.plannedAt)
    : "Not set";

  const header =
    params.kind === "assign"
      ? "*FMS step assigned*"
      : params.kind === "due_coming"
        ? "*FMS step due soon*"
        : params.kind === "same_day"
          ? "*FMS step due today*"
          : "*FMS step overdue*";

  const intro =
    params.kind === "assign"
      ? `Hi ${params.assigneeName}, a workflow step has been assigned to you.`
      : params.kind === "due_coming"
        ? `Hi ${params.assigneeName}, this step is due in ${params.dueComingDaysBefore ?? 1} day(s).`
        : params.kind === "same_day"
          ? `Hi ${params.assigneeName}, this step is due today.`
          : `Hi ${params.assigneeName}, this step is past its planned date.`;

  return [
    header,
    ``,
    intro,
    ``,
    `*Job:* ${params.referenceLabel}`,
    `*Step:* ${params.stepName}`,
    `*Planned:* ${plannedLabel}`,
    `*Team:* ${params.organizationName}`,
    ``,
    `Open Sheetomatic FMS to complete this step.`,
  ].join("\n");
}

export async function dispatchFmsStepReminder(params: {
  stepStateId: string;
  kind: FmsReminderKind;
  referenceLabel: string;
  stepName: string;
  plannedAt: Date | null;
  assignee: Assignee;
  organizationName: string;
  organizationId: string;
  alertConfig: FmsAlertConfig | unknown;
  dueComingDaysBefore?: number;
}) {
  const config = parseAlertConfig(params.alertConfig);
  const parts: string[] = [];
  let whatsappSent = false;
  let whatsappDetail: string | undefined;

  if (!config.whatsappEnabled) {
    return { whatsappSent: false, summary: "WhatsApp alerts disabled" };
  }

  const kindEnabled =
    (params.kind === "assign" && config.onAssign) ||
    (params.kind === "due_coming" && config.onDueComing) ||
    (params.kind === "same_day" && config.onSameDay) ||
    (params.kind === "overdue" && config.onOverdue);

  if (!kindEnabled) {
    return { whatsappSent: false, summary: "Alert type disabled" };
  }

  const assigneeName =
    params.assignee.name ?? params.assignee.email.split("@")[0];
  const phone = params.assignee.phone?.trim() || "";

  if (!phone) {
    return { whatsappSent: false, summary: "WhatsApp: no phone" };
  }

  const body = buildMessageBody({
    kind: params.kind,
    referenceLabel: params.referenceLabel,
    stepName: params.stepName,
    plannedAt: params.plannedAt,
    assigneeName,
    organizationName: params.organizationName,
    dueComingDaysBefore:
      params.dueComingDaysBefore ?? config.dueComingDaysBefore,
  });

  const wa = await sendFmsStepReminderWhatsApp({
    toPhone: phone,
    organizationId: params.organizationId,
    body,
    stepStateId: params.stepStateId,
  });

  if (wa.sent) {
    whatsappSent = true;
    parts.push("WhatsApp");
  } else if (wa.reason === "phone_id_required") {
    parts.push("WA not configured");
  } else if (wa.reason === "not_configured") {
    parts.push("WhatsApp not configured");
  } else if (wa.reason === "invalid_phone") {
    parts.push("WhatsApp invalid phone");
  } else if (wa.reason === "session_required") {
    parts.push("WhatsApp session required");
  } else {
    whatsappDetail = wa.detail;
    parts.push(
      wa.detail
        ? `WhatsApp failed: ${wa.detail.slice(0, 160)}`
        : "WhatsApp failed",
    );
    console.error(
      "[fms-reminders] WhatsApp send failed",
      wa.reason,
      wa.detail,
      { stepStateId: params.stepStateId, kind: params.kind },
    );
  }

  return { whatsappSent, summary: parts.join(", "), whatsappDetail };
}

export function startOfLocalDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isSameLocalDay(a: Date, b: Date) {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

export function addLocalDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
