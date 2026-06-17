import { sendFmsStepReminderWhatsApp } from "@/lib/integrations/whatsapp";
import { sendFmsStepReminderEmail } from "@/lib/integrations/email";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";
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

function fmsInstanceUrl(instanceId: string) {
  return `${getLoginBaseUrl()}/app/fms/instances/${instanceId}`;
}

function buildMessageBody(params: {
  kind: FmsReminderKind;
  referenceLabel: string;
  stepName: string;
  plannedAt: Date | null;
  assigneeName: string;
  organizationName: string;
  instanceUrl: string;
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
    `Open: ${params.instanceUrl}`,
  ].join("\n");
}

export async function dispatchFmsStepReminder(params: {
  stepStateId: string;
  instanceId: string;
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
  let emailSent = false;
  let whatsappDetail: string | undefined;

  const kindEnabled =
    (params.kind === "assign" && config.onAssign) ||
    (params.kind === "due_coming" && config.onDueComing) ||
    (params.kind === "same_day" && config.onSameDay) ||
    (params.kind === "overdue" && config.onOverdue);

  if (!kindEnabled) {
    return { whatsappSent: false, emailSent: false, summary: "Alert type disabled" };
  }

  const assigneeName =
    params.assignee.name ?? params.assignee.email.split("@")[0];
  const instanceUrl = fmsInstanceUrl(params.instanceId);
  const plannedLabel = params.plannedAt
    ? formatPlannedDate(params.plannedAt)
    : "Not set";

  if (config.whatsappEnabled) {
    const phone = params.assignee.phone?.trim() || "";

    if (phone) {
      const body = buildMessageBody({
        kind: params.kind,
        referenceLabel: params.referenceLabel,
        stepName: params.stepName,
        plannedAt: params.plannedAt,
        assigneeName,
        organizationName: params.organizationName,
        instanceUrl,
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
    } else {
      parts.push("WhatsApp: no phone");
    }
  }

  if (config.emailEnabled && params.assignee.email) {
    const email = await sendFmsStepReminderEmail({
      toEmail: params.assignee.email,
      kind: params.kind,
      assigneeName,
      referenceLabel: params.referenceLabel,
      stepName: params.stepName,
      plannedLabel,
      organizationName: params.organizationName,
      instanceUrl,
      dueComingDaysBefore:
        params.dueComingDaysBefore ?? config.dueComingDaysBefore,
    });

    if (email.sent) {
      emailSent = true;
      parts.push("Email");
    } else if (email.reason === "not_configured") {
      if (!whatsappSent) {
        parts.push("Email not configured");
      }
    } else {
      parts.push("Email failed");
      console.error("[fms-reminders] Email send failed", email.detail, {
        stepStateId: params.stepStateId,
        kind: params.kind,
      });
    }
  }

  if (parts.length === 0) {
    return { whatsappSent, emailSent, summary: "No channels enabled" };
  }

  return {
    whatsappSent,
    emailSent,
    summary: parts.join(", "),
    whatsappDetail,
  };
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
