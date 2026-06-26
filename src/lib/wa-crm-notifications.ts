import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";
import { formatWhatsAppPhone } from "@/lib/phone";
import { aiPortalOrigin } from "@/lib/workspace-auth-links";
import { prisma } from "@/lib/db";

type LeadSummary = {
  name: string | null;
  phone: string;
};

function formatLeadLine(lead: LeadSummary) {
  const formattedPhone = formatWhatsAppPhone(lead.phone);
  const name = lead.name?.trim();
  if (!name || name === formattedPhone) {
    return `- ${formattedPhone}`;
  }
  return `- ${name} (${formattedPhone})`;
}

export async function notifyWaLeadAssignment(params: {
  organizationId: string;
  assigneeUserId: string;
  leads: LeadSummary[];
}) {
  if (params.leads.length === 0) {
    return { sent: false as const, detail: "no_leads" };
  }

  const assignee = await prisma.user.findFirst({
    where: {
      id: params.assigneeUserId,
      memberships: { some: { organizationId: params.organizationId } },
    },
    select: { name: true, phone: true },
  });

  const phone = assignee?.phone?.trim() || "";
  if (!phone) {
    return { sent: false as const, detail: "assignee_has_no_phone" };
  }

  const assigneeName = assignee?.name?.trim() || "there";
  const leadLines = params.leads.slice(0, 10).map(formatLeadLine);
  const overflow =
    params.leads.length > 10
      ? `...and ${params.leads.length - 10} more`
      : "";
  const crmUrl = `${aiPortalOrigin()}/ai/app/contacts`;

  const bodyParts = [
    `*New lead${params.leads.length > 1 ? "s" : ""} assigned*`,
    `Hi ${assigneeName},`,
    ...leadLines,
    overflow,
    `Open CRM: ${crmUrl}`,
  ].filter(Boolean);

  const body = bodyParts.join("\n\n");

  const result = await sendWhatsAppText({
    organizationId: params.organizationId,
    toPhone: phone,
    body,
  });

  if (result.sent) {
    return { sent: true as const };
  }

  return {
    sent: false as const,
    detail: result.detail ?? result.reason,
  };
}
