import { prisma } from "@/lib/db";
import { sendPlainEmail } from "@/lib/integrations/email";
import { sendTaskAssignmentWhatsApp } from "@/lib/integrations/whatsapp";
import { getStockRows } from "@/lib/ims/ims-store";
import { resolveMemberModules } from "@/lib/workspace-modules";
import {
  IMS_STOCK_STATUS_LABELS,
  formatImsQty,
} from "@/lib/ims/stock-status";

const MAX_LINES = 50;

type Recipient = {
  userId: string;
  email: string;
  name: string | null;
  phone: string | null;
  alertViaEmail: boolean;
  alertViaWhatsApp: boolean;
  organizationId: string;
  organizationName: string;
};

async function sendReorderMessage(
  recipient: Recipient,
  subject: string,
  text: string,
) {
  let emailSent = false;
  let whatsappSent = false;

  if (recipient.alertViaEmail) {
    const email = await sendPlainEmail({
      toEmail: recipient.email,
      subject,
      text,
    });
    emailSent = email.sent;
  }

  if (recipient.alertViaWhatsApp && recipient.phone?.trim()) {
    const wa = await sendTaskAssignmentWhatsApp({
      toPhone: recipient.phone.trim(),
      taskId: "ims-reorder-alert",
      taskTitle: subject,
      taskDescription: text,
      assigneeName: recipient.name ?? recipient.email.split("@")[0],
      priority: "MEDIUM",
      dueAt: new Date(),
      organizationName: recipient.organizationName,
      organizationId: recipient.organizationId,
      frequencyLabel: "Once",
      isRecurring: false,
      reminderKind: "due",
    });
    whatsappSent = wa.sent;
  }

  return { emailSent, whatsappSent };
}

export async function dispatchImsReorderAlerts() {
  const settingsRows = await prisma.userNotificationSettings.findMany({
    where: { imsReorderAlert: true },
    include: {
      user: { select: { id: true, email: true, name: true, phone: true } },
      organization: { select: { id: true, name: true } },
    },
  });

  const byOrg = new Map<string, typeof settingsRows>();
  for (const row of settingsRows) {
    const list = byOrg.get(row.organizationId) ?? [];
    list.push(row);
    byOrg.set(row.organizationId, list);
  }

  let orgsProcessed = 0;
  let alertsSent = 0;

  for (const [organizationId, rows] of byOrg) {
    const memberships = await prisma.membership.findMany({
      where: {
        organizationId,
        userId: { in: rows.map((row) => row.userId) },
      },
      select: { userId: true, role: true, modules: true },
    });

    const imsUsers = new Set(
      memberships
        .filter((membership) =>
          resolveMemberModules(membership.role, membership.modules).includes(
            "IMS",
          ),
        )
        .map((membership) => membership.userId),
    );

    const recipients: Recipient[] = rows
      .filter((row) => imsUsers.has(row.userId))
      .map((row) => ({
        userId: row.userId,
        email: row.user.email,
        name: row.user.name,
        phone: row.user.phone,
        alertViaEmail: row.alertViaEmail,
        alertViaWhatsApp: row.alertViaWhatsApp,
        organizationId,
        organizationName: row.organization.name,
      }));

    if (recipients.length === 0) {
      continue;
    }

    const stock = await getStockRows(organizationId);
    const lowStock = stock
      .filter((row) => row.status === "red" || row.status === "orange")
      .sort((a, b) => a.usableQty - b.usableQty);

    if (lowStock.length === 0) {
      continue;
    }

    orgsProcessed += 1;

    const lines = lowStock.slice(0, MAX_LINES).map((row) => {
      const reorderAt = Number(row.item.reorderQty);
      return `${IMS_STOCK_STATUS_LABELS[row.status]}: ${row.item.code} ${row.item.name} - ${formatImsQty(
        row.usableQty,
        row.item.uom,
      )} on hand (reorder at ${formatImsQty(reorderAt, row.item.uom)})`;
    });

    const orgName = recipients[0]?.organizationName ?? "your workspace";
    const subject = `Inventory reorder alert - ${orgName} (${lowStock.length} item${
      lowStock.length === 1 ? "" : "s"
    })`;

    for (const recipient of recipients) {
      const body = [
        `Hello ${recipient.name ?? recipient.email.split("@")[0]},`,
        "",
        `${lowStock.length} item${lowStock.length === 1 ? " is" : "s are"} at or below the reorder level in ${orgName}:`,
        "",
        ...lines.map((line) => `- ${line}`),
      ];

      if (lowStock.length > MAX_LINES) {
        body.push(
          `...and ${lowStock.length - MAX_LINES} more items below their reorder level.`,
        );
      }

      body.push(
        "",
        "Open Inventory > Stock to plan purchases.",
        "Manage these alerts in Workspace > Settings.",
      );

      const text = body.join("\n");

      const result = await sendReorderMessage(recipient, subject, text);
      if (result.emailSent || result.whatsappSent) {
        alertsSent += 1;
      }
    }
  }

  return {
    orgsProcessed,
    alertsSent,
    recipientsChecked: settingsRows.length,
  };
}
