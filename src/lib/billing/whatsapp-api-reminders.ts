import { prisma } from "@/lib/db";
import { daysUntilDue, formatBillingDate, isPastDueDate } from "@/lib/billing/dates";
import { shouldSendReminder } from "@/lib/billing/dates";
import { formatInrPaise } from "@/lib/billing/money";
import { whatsAppApiRechargePay } from "@/lib/billing/whatsapp-api-plans";
import { sendPlainEmail } from "@/lib/integrations/email";
import { deliverWhatsAppMessage } from "@/lib/integrations/whatsapp-provider";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";

export function whatsAppApiReminderText(input: {
  name: string;
  planLabel: string;
  amountPaise: number;
  expiresAt: Date;
  daysLeft: number;
}) {
  const pay = whatsAppApiRechargePay();
  const when =
    input.daysLeft < 0
      ? `expired on ${formatBillingDate(input.expiresAt)}`
      : input.daysLeft === 0
        ? `expires *today* (${formatBillingDate(input.expiresAt)})`
        : `expires in *${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"}* (${formatBillingDate(input.expiresAt)})`;

  return [
    `Hi ${input.name},`,
    "",
    `Your Sheetomatic WhatsApp API plan *${input.planLabel}* ${when}.`,
    `Recharge amount: *${formatInrPaise(input.amountPaise)}*`,
    "",
    `Pay UPI: ${pay.upiId}`,
    `Name: ${pay.payeeName}`,
    "",
    "Reply *paid* with the UTR after recharge so we can extend your plan on time.",
    "",
    "— Team Sheetomatic",
  ].join("\n");
}

async function sendWhatsAppApiReminderChannels(input: {
  name: string;
  phone: string;
  email: string | null;
  planLabel: string;
  amountPaise: number;
  expiresAt: Date;
  daysLeft: number;
}) {
  const body = whatsAppApiReminderText(input);
  const primary = await prisma.organization.findFirst({
    where: { OR: [{ isPrimary: true }, { slug: PRIMARY_ORG_SLUG }] },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  let whatsappSent = false;
  let emailSent = false;

  if (primary) {
    const wa = await deliverWhatsAppMessage({
      organizationId: primary.id,
      toPhone: input.phone,
      preferOfficial: false,
      message: { type: "text", text: { body } },
    });
    whatsappSent = wa.sent;
    if (!wa.sent) {
      const official = await deliverWhatsAppMessage({
        organizationId: primary.id,
        toPhone: input.phone,
        preferOfficial: true,
        message: { type: "text", text: { body } },
      });
      whatsappSent = official.sent;
    }
  }

  if (input.email) {
    const due = formatBillingDate(input.expiresAt);
    const mail = await sendPlainEmail({
      toEmail: input.email,
      subject:
        input.daysLeft < 0
          ? `WhatsApp API plan expired — recharge ${input.planLabel}`
          : input.daysLeft === 0
            ? `WhatsApp API plan due today — ${input.planLabel}`
            : `WhatsApp API recharge reminder — due ${due}`,
      text: body,
    });
    emailSent = mail.sent;
  }

  return { whatsappSent, emailSent };
}

export async function sendWhatsAppApiClientReminder(id: string, now = new Date()) {
  const client = await prisma.whatsAppApiClient.findUnique({ where: { id } });
  if (!client || client.status === "CANCELLED") {
    return { ok: false as const, message: "WhatsApp API client not found." };
  }

  const daysLeft = daysUntilDue(client.expiresAt, now);
  const sent = await sendWhatsAppApiReminderChannels({
    name: client.name,
    phone: client.phone,
    email: client.email,
    planLabel: client.planLabel,
    amountPaise: client.amountPaise,
    expiresAt: client.expiresAt,
    daysLeft,
  });

  if (!sent.whatsappSent && !sent.emailSent) {
    return {
      ok: false as const,
      message:
        "Could not send WhatsApp or email. Check Sheetomatic WhatsApp (Web Based API) and the client number/email.",
    };
  }

  await prisma.whatsAppApiClient.update({
    where: { id },
    data: {
      lastReminderAt: now,
      reminderCount: { increment: 1 },
    },
  });

  return {
    ok: true as const,
    whatsappSent: sent.whatsappSent,
    emailSent: sent.emailSent,
  };
}

export async function runWhatsAppApiRechargeReminders(now = new Date()) {
  const sent: string[] = [];
  const expired: string[] = [];

  const clients = await prisma.whatsAppApiClient.findMany({
    where: { status: { in: ["ACTIVE", "EXPIRED"] } },
  });

  for (const client of clients) {
    if (isPastDueDate(client.expiresAt, now) && client.status === "ACTIVE") {
      await prisma.whatsAppApiClient.update({
        where: { id: client.id },
        data: { status: "EXPIRED" },
      });
      expired.push(client.phone);
    }

    const daysLeft = daysUntilDue(client.expiresAt, now);
    if (!shouldSendReminder(daysLeft, client.lastReminderAt, now)) {
      continue;
    }
    if (client.status === "CANCELLED") {
      continue;
    }

    const result = await sendWhatsAppApiReminderChannels({
      name: client.name,
      phone: client.phone,
      email: client.email,
      planLabel: client.planLabel,
      amountPaise: client.amountPaise,
      expiresAt: client.expiresAt,
      daysLeft,
    });
    if (!result.whatsappSent && !result.emailSent) {
      continue;
    }
    await prisma.whatsAppApiClient.update({
      where: { id: client.id },
      data: {
        lastReminderAt: now,
        reminderCount: { increment: 1 },
      },
    });
    sent.push(client.phone);
  }

  return {
    whatsappApiReminders: sent.length,
    whatsappApiExpired: expired.length,
    whatsappApiReminderPhones: sent,
  };
}
