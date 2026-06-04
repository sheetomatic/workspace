import { prisma } from "@/lib/db";
import { normalizeWhatsAppPhone } from "@/lib/phone";

const WHATSAPP_SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

/** True when the assignee messaged this workspace within Meta's 24-hour session window. */
export async function hasActiveWhatsAppSession(
  organizationId: string,
  toPhone: string,
): Promise<boolean> {
  const phone = normalizeWhatsAppPhone(toPhone);
  if (!phone) {
    return false;
  }

  const cutoff = new Date(Date.now() - WHATSAPP_SESSION_WINDOW_MS);

  const inboundEvent = await prisma.whatsAppInboundEvent.findFirst({
    where: {
      organizationId,
      fromPhone: phone,
      createdAt: { gte: cutoff },
    },
    select: { id: true },
  });
  if (inboundEvent) {
    return true;
  }

  const inboundMessage = await prisma.waMessage.findFirst({
    where: {
      organizationId,
      direction: "INBOUND",
      createdAt: { gte: cutoff },
      conversation: {
        contact: { phone },
      },
    },
    select: { id: true },
  });

  return Boolean(inboundMessage);
}
