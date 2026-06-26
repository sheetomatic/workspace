import type { LegalCase, UserNotificationSettings } from "@prisma/client";
import { sendPlainEmail } from "@/lib/integrations/email";
import { sendTaskAssignmentWhatsApp } from "@/lib/integrations/whatsapp";
import {
  assignedSectionsForCode,
  normalizeStaffCode,
} from "@/lib/legal-cases/access";
import {
  needsClientCallAlert,
  needsSigningFilingAlert,
  signingFilingGapDays,
} from "@/lib/legal-cases/case-alerts";
import {
  daysBetween,
  parseLegalNextDate,
  startOfLocalDay,
} from "@/lib/legal-cases/parse-next-date";
import { hasTrackableNextDate } from "@/lib/legal-cases/next-date";
import { prisma } from "@/lib/db";
import { ACTIVE_TASK_STATUSES } from "@/lib/tasks";
import { formatTaskDue } from "@/lib/tasks";

type AlertRecipient = {
  userId: string;
  email: string;
  name: string | null;
  phone: string | null;
  staffCode: string | null;
  settings: UserNotificationSettings;
  organizationName: string;
};

function caseMatchesStaffCode(legalCase: LegalCase, staffCode: string) {
  if (!staffCode) {
    return false;
  }
  return assignedSectionsForCode(legalCase, staffCode).length > 0;
}

function classifyCaseNextDate(
  nextDate: string,
  today: Date,
  daysBefore: number,
): "upcoming" | "overdue" | null {
  const parsed = parseLegalNextDate(nextDate);
  if (!parsed) {
    return null;
  }
  const hearingDay = startOfLocalDay(parsed);
  const diff = daysBetween(today, hearingDay);
  if (diff < 0) {
    return "overdue";
  }
  if (diff <= daysBefore) {
    return "upcoming";
  }
  return null;
}

async function sendAlertMessage(
  recipient: AlertRecipient,
  subject: string,
  text: string,
) {
  let emailSent = false;
  let whatsappSent = false;

  if (recipient.settings.alertViaEmail) {
    const email = await sendPlainEmail({
      toEmail: recipient.email,
      subject,
      text,
    });
    emailSent = email.sent;
  }

  if (recipient.settings.alertViaWhatsApp && recipient.phone?.trim()) {
    const wa = await sendTaskAssignmentWhatsApp({
      toPhone: recipient.phone.trim(),
      taskId: "due-date-alert",
      taskTitle: subject,
      taskDescription: text,
      assigneeName: recipient.name ?? recipient.email.split("@")[0],
      priority: "MEDIUM",
      dueAt: new Date(),
      organizationName: recipient.organizationName,
      organizationId: recipient.settings.organizationId,
      frequencyLabel: "Once",
      isRecurring: false,
      reminderKind: "due",
    });
    whatsappSent = wa.sent;
  }

  return { emailSent, whatsappSent };
}

export async function dispatchDueDateAlerts() {
  const today = startOfLocalDay(new Date());
  const settingsRows = await prisma.userNotificationSettings.findMany({
    where: {
      OR: [
        { caseDueDateAlert: true },
        { caseOverdueAlert: true },
        { taskDueDateAlert: true },
        { taskOverdueAlert: true },
      ],
    },
    include: {
      user: { select: { id: true, email: true, name: true, phone: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  let usersProcessed = 0;
  let alertsSent = 0;

  for (const row of settingsRows) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: row.userId,
          organizationId: row.organizationId,
        },
      },
      select: { staffCode: true },
    });

    const recipient: AlertRecipient = {
      userId: row.userId,
      email: row.user.email,
      name: row.user.name,
      phone: row.user.phone,
      staffCode: membership?.staffCode ?? null,
      settings: row,
      organizationName: row.organization.name,
    };

    const lines: string[] = [];
    const staffCode = normalizeStaffCode(recipient.staffCode);

    if (row.caseDueDateAlert || row.caseOverdueAlert) {
      const cases = await prisma.legalCase.findMany({
        where: { organizationId: row.organizationId },
        select: {
          caseRef: true,
          fileNumber: true,
          nextDate: true,
          s2Responsible: true,
          s3Responsible: true,
          s4Responsible: true,
          s5Responsible: true,
          s6Responsible: true,
          s7Responsible: true,
        },
        take: 500,
      });

      for (const legalCase of cases) {
        if (!hasTrackableNextDate(legalCase.nextDate) || !legalCase.nextDate) {
          continue;
        }
        if (!caseMatchesStaffCode(legalCase as LegalCase, staffCode)) {
          continue;
        }

        const kind = classifyCaseNextDate(
          legalCase.nextDate,
          today,
          row.alertDaysBefore,
        );
        if (
          (kind === "upcoming" && row.caseDueDateAlert) ||
          (kind === "overdue" && row.caseOverdueAlert)
        ) {
          const label = kind === "overdue" ? "Overdue hearing" : "Upcoming hearing";
          lines.push(
            `${label}: ${legalCase.caseRef} (${legalCase.fileNumber}) - next date ${legalCase.nextDate}`,
          );
        }
      }

      const alertCases = await prisma.legalCase.findMany({
        where: { organizationId: row.organizationId },
        select: {
          caseRef: true,
          fileNumber: true,
          signingDate: true,
          caseFiled: true,
          sectionData: true,
          s2Responsible: true,
          s3Responsible: true,
          s4Responsible: true,
          s5Responsible: true,
          s6Responsible: true,
          s7Responsible: true,
        },
        take: 500,
      });

      for (const legalCase of alertCases) {
        if (!caseMatchesStaffCode(legalCase as LegalCase, staffCode)) {
          continue;
        }

        if (row.caseDueDateAlert && needsSigningFilingAlert(legalCase)) {
          const gap = signingFilingGapDays(legalCase);
          lines.push(
            `Signing/filing overdue: ${legalCase.caseRef} (${legalCase.fileNumber}) - signed ${legalCase.signingDate}, not filed (${gap} days)`,
          );
        }

        if (row.caseDueDateAlert && needsClientCallAlert(legalCase as LegalCase)) {
          lines.push(
            `Client call overdue: ${legalCase.caseRef} (${legalCase.fileNumber}) - log call in process diary`,
          );
        }
      }
    }

    if (row.taskDueDateAlert || row.taskOverdueAlert) {
      const tasks = await prisma.delegatedTask.findMany({
        where: {
          organizationId: row.organizationId,
          assigneeUserId: row.userId,
          status: { in: ACTIVE_TASK_STATUSES },
        },
        select: { title: true, dueAt: true },
        take: 100,
      });

      for (const task of tasks) {
        const diff = daysBetween(today, startOfLocalDay(task.dueAt));
        const overdue = diff < 0;
        const upcoming = diff >= 0 && diff <= row.alertDaysBefore;

        if ((overdue && row.taskOverdueAlert) || (upcoming && row.taskDueDateAlert)) {
          const label = overdue ? "Overdue task" : "Task due soon";
          lines.push(`${label}: ${task.title} - due ${formatTaskDue(task.dueAt)}`);
        }
      }
    }

    if (lines.length === 0) {
      continue;
    }

    usersProcessed += 1;
    const subject = `Sheetomatic alerts - ${recipient.organizationName}`;
    const text = [
      `Hello ${recipient.name ?? recipient.email.split("@")[0]},`,
      "",
      "Here are your workspace alerts for today:",
      "",
      ...lines.map((line) => `- ${line}`),
      "",
      "Manage these preferences in Workspace > Settings.",
    ].join("\n");

    const result = await sendAlertMessage(recipient, subject, text);
    if (result.emailSent || result.whatsappSent) {
      alertsSent += 1;
    }
  }

  return { usersProcessed, alertsSent, settingsChecked: settingsRows.length };
}
