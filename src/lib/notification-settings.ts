import { prisma } from "@/lib/db";

export type NotificationSettingsRow = {
  caseDueDateAlert: boolean;
  caseOverdueAlert: boolean;
  taskDueDateAlert: boolean;
  taskOverdueAlert: boolean;
  imsReorderAlert: boolean;
  alertDaysBefore: number;
  alertViaEmail: boolean;
  alertViaWhatsApp: boolean;
};

export const ALERT_DAYS_OPTIONS = [1, 3, 7] as const;

const DEFAULTS: NotificationSettingsRow = {
  caseDueDateAlert: true,
  caseOverdueAlert: true,
  taskDueDateAlert: true,
  taskOverdueAlert: true,
  imsReorderAlert: false,
  alertDaysBefore: 1,
  alertViaEmail: true,
  alertViaWhatsApp: false,
};

export async function getOrCreateNotificationSettings(
  userId: string,
  organizationId: string,
): Promise<NotificationSettingsRow> {
  const row = await prisma.userNotificationSettings.upsert({
    where: {
      userId_organizationId: { userId, organizationId },
    },
    create: {
      userId,
      organizationId,
      ...DEFAULTS,
    },
    update: {},
    select: {
      caseDueDateAlert: true,
      caseOverdueAlert: true,
      taskDueDateAlert: true,
      taskOverdueAlert: true,
      imsReorderAlert: true,
      alertDaysBefore: true,
      alertViaEmail: true,
      alertViaWhatsApp: true,
    },
  });

  return row;
}

export function parseNotificationSettingsForm(formData: FormData): NotificationSettingsRow {
  const daysRaw = Number(formData.get("alertDaysBefore") ?? 1);
  const alertDaysBefore = ALERT_DAYS_OPTIONS.includes(
    daysRaw as (typeof ALERT_DAYS_OPTIONS)[number],
  )
    ? daysRaw
    : 1;

  return {
    caseDueDateAlert: formData.get("caseDueDateAlert") === "on",
    caseOverdueAlert: formData.get("caseOverdueAlert") === "on",
    taskDueDateAlert: formData.get("taskDueDateAlert") === "on",
    taskOverdueAlert: formData.get("taskOverdueAlert") === "on",
    imsReorderAlert: formData.get("imsReorderAlert") === "on",
    alertDaysBefore,
    alertViaEmail: formData.get("alertViaEmail") === "on",
    alertViaWhatsApp: formData.get("alertViaWhatsApp") === "on",
  };
}
