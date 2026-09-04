import "server-only";

import { prisma } from "@/lib/db";
import { sendPlainEmail } from "@/lib/integrations/email";
import { sendTaskAssignmentWhatsApp } from "@/lib/integrations/whatsapp";
import {
  effectiveMoq,
  isBelowMoq,
  shouldAlertOnDecrement,
} from "@/lib/mobile-shop/moq";

const NOTIFY_KIND = "MOBILE_SHOP_MOQ";
const STOCK_HREF = "/app/mobile-shop/stock";
const MAX_DIGEST_LINES = 20;

type QtyItem = {
  id: string;
  name: string;
  kind: string;
  qty: number;
  moq: number;
};

async function ownerRecipients(organizationId: string) {
  const [org, members] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    }),
    prisma.membership.findMany({
      where: {
        organizationId,
        role: "OWNER",
        deactivatedAt: null,
      },
      select: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    }),
  ]);
  return {
    organizationName: org?.name ?? "your shop",
    owners: members.map((row) => row.user),
  };
}

async function sendOwnerAlerts(params: {
  organizationId: string;
  title: string;
  body: string;
  whatsappDescription: string;
}) {
  const { organizationName, owners } = await ownerRecipients(params.organizationId);
  if (owners.length === 0) return { inApp: 0, email: 0, whatsapp: 0 };

  let inApp = 0;
  let email = 0;
  let whatsapp = 0;

  for (const owner of owners) {
    const existing = await prisma.userAppNotification.findFirst({
      where: {
        userId: owner.id,
        organizationId: params.organizationId,
        kind: NOTIFY_KIND,
        href: STOCK_HREF,
        body: params.body,
        readAt: null,
      },
      select: { id: true },
    });
    if (!existing) {
      await prisma.userAppNotification.create({
        data: {
          userId: owner.id,
          organizationId: params.organizationId,
          kind: NOTIFY_KIND,
          title: params.title,
          body: params.body,
          href: STOCK_HREF,
        },
      });
      inApp += 1;
    }

    const emailResult = await sendPlainEmail({
      toEmail: owner.email,
      subject: `${params.title} · ${organizationName}`,
      text: [
        `Hello ${owner.name ?? owner.email.split("@")[0]},`,
        "",
        params.whatsappDescription,
        "",
        "Open Mobile shop → Stock to reorder.",
      ].join("\n"),
    });
    if (emailResult.sent) email += 1;

    if (owner.phone?.trim()) {
      const wa = await sendTaskAssignmentWhatsApp({
        toPhone: owner.phone.trim(),
        taskId: "mobile-shop-moq",
        taskTitle: params.title,
        taskDescription: params.whatsappDescription,
        assigneeName: owner.name ?? owner.email.split("@")[0],
        priority: "MEDIUM",
        dueAt: new Date(),
        organizationName,
        organizationId: params.organizationId,
        frequencyLabel: "Once",
        isRecurring: false,
        reminderKind: "due",
      });
      if (wa.sent) whatsapp += 1;
    }
  }

  return { inApp, email, whatsapp };
}

export async function notifyIfBelowMoq(params: {
  organizationId: string;
  qtyBefore: number;
  item: QtyItem;
}) {
  if (
    !shouldAlertOnDecrement(
      params.qtyBefore,
      params.item.qty,
      params.item.moq,
      params.item.kind,
    )
  ) {
    return;
  }
  const floor = effectiveMoq(params.item.moq, params.item.kind);
  const body = `${params.item.name} · qty ${params.item.qty} (MOQ ${floor})`;
  try {
    await sendOwnerAlerts({
      organizationId: params.organizationId,
      title: "Below MOQ",
      body,
      whatsappDescription: `${params.item.name} is at qty ${params.item.qty} — reorder level ${floor}.`,
    });
  } catch (error) {
    console.error("[mobile-shop] moq alert failed", error);
  }
}

export async function dispatchMobileShopMoqAlerts() {
  const items = await prisma.mobileShopItem.findMany({
    where: { kind: { in: ["ACCESSORY", "PART"] } },
    select: {
      id: true,
      name: true,
      kind: true,
      qty: true,
      moq: true,
      organizationId: true,
    },
  });

  const byOrg = new Map<string, QtyItem[]>();
  for (const item of items) {
    if (!isBelowMoq(item.qty, item.moq, item.kind)) continue;
    const list = byOrg.get(item.organizationId) ?? [];
    list.push(item);
    byOrg.set(item.organizationId, list);
  }

  let orgsProcessed = 0;
  let alertsSent = 0;

  for (const [organizationId, low] of byOrg) {
    if (low.length === 0) continue;
    orgsProcessed += 1;
    const lines = low
      .sort((a, b) => a.qty - b.qty || a.name.localeCompare(b.name))
      .slice(0, MAX_DIGEST_LINES)
      .map((item) => {
        const floor = effectiveMoq(item.moq, item.kind);
        return `${item.name} · qty ${item.qty} (MOQ ${floor})`;
      });
    const extra =
      low.length > MAX_DIGEST_LINES
        ? `\n...and ${low.length - MAX_DIGEST_LINES} more.`
        : "";
    const result = await sendOwnerAlerts({
      organizationId,
      title: `Below MOQ · ${low.length} item${low.length === 1 ? "" : "s"}`,
      body: lines.join(" · "),
      whatsappDescription: `${low.length} item${low.length === 1 ? " is" : "s are"} at or below reorder level:\n${lines.map((line) => `- ${line}`).join("\n")}${extra}`,
    });
    if (result.inApp + result.email + result.whatsapp > 0) alertsSent += 1;
  }

  return { orgsProcessed, alertsSent, itemsChecked: items.length };
}
