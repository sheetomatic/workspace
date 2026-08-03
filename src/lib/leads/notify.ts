import { prisma } from "@/lib/db";
import { sendPlainEmail } from "@/lib/integrations/email";
import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";

function leadCrmHref(leadId: string) {
  return `/app/leads?period=all&leadId=${leadId}`;
}

function leadLabel(lead: { name?: string | null; phone?: string | null; company?: string | null }) {
  return (
    lead.name?.trim() ||
    lead.company?.trim() ||
    lead.phone?.trim() ||
    "New lead"
  );
}

/**
 * Notify a team member that a lead was assigned to them:
 * in-app bell + email + WhatsApp (each best-effort, never throws).
 */
export async function notifyLeadAssigned(params: {
  organizationId: string;
  leadId: string;
  assigneeUserId: string;
  actorUserId?: string | null;
  actorName?: string | null;
}) {
  if (params.assigneeUserId === params.actorUserId) {
    return;
  }

  const [assignee, lead, organization] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: params.assigneeUserId,
        memberships: { some: { organizationId: params.organizationId } },
      },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.inboundLead.findFirst({
      where: { id: params.leadId, organizationId: params.organizationId },
      select: { name: true, phone: true, company: true, requirement: true },
    }),
    prisma.organization.findUnique({
      where: { id: params.organizationId },
      select: { name: true },
    }),
  ]);
  if (!assignee || !lead) {
    return;
  }

  const label = leadLabel(lead);
  const href = leadCrmHref(params.leadId);
  const orgName = organization?.name?.trim() || "your workspace";
  const byLine = params.actorName?.trim()
    ? ` by ${params.actorName.trim()}`
    : "";

  await prisma.userAppNotification
    .create({
      data: {
        userId: assignee.id,
        organizationId: params.organizationId,
        kind: "LEAD_ASSIGNED",
        title: "Lead assigned to you",
        body: label,
        href,
      },
    })
    .catch((error) => console.error("[lead-notify] in-app", error));

  const detailLines = [
    `Lead: ${label}`,
    lead.phone?.trim() ? `Phone: ${lead.phone.trim()}` : null,
    lead.requirement?.trim() ? `Requirement: ${lead.requirement.trim()}` : null,
    "",
    `Open in CRM: ${getLoginBaseUrl()}${href}`,
  ].filter((line) => line !== null);

  if (assignee.email) {
    await sendPlainEmail({
      toEmail: assignee.email,
      subject: `Lead assigned to you — ${label}`,
      text: [
        `Hi ${assignee.name?.trim() || "there"},`,
        "",
        `A lead in ${orgName} was assigned to you${byLine}.`,
        "",
        ...detailLines,
      ].join("\n"),
    }).catch((error) => console.error("[lead-notify] email", error));
  }

  const assigneePhone = assignee.phone?.trim();
  if (assigneePhone) {
    await sendWhatsAppText({
      organizationId: params.organizationId,
      toPhone: assigneePhone,
      body: [
        `*Lead assigned to you*`,
        `Hi ${assignee.name?.trim() || "there"}, a lead was assigned to you${byLine}.`,
        ...detailLines.filter(Boolean),
      ].join("\n\n"),
    }).catch((error) => console.error("[lead-notify] whatsapp", error));
  }
}

/**
 * One summary notification after a bulk assignment: "N leads assigned to you"
 * plus a report of every lead (in-app bell + email + WhatsApp, best-effort).
 */
export async function notifyLeadsBulkAssigned(params: {
  organizationId: string;
  leadIds: string[];
  assigneeUserId: string;
  actorUserId?: string | null;
  actorName?: string | null;
}) {
  if (params.leadIds.length === 0) {
    return;
  }

  const [assignee, leads, organization] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: params.assigneeUserId,
        memberships: { some: { organizationId: params.organizationId } },
      },
      select: { id: true, name: true, email: true, phone: true },
    }),
    prisma.inboundLead.findMany({
      where: {
        id: { in: params.leadIds },
        organizationId: params.organizationId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        company: true,
        requirement: true,
        status: true,
      },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.organization.findUnique({
      where: { id: params.organizationId },
      select: { name: true },
    }),
  ]);
  if (!assignee || leads.length === 0) {
    return;
  }

  const count = leads.length;
  const orgName = organization?.name?.trim() || "your workspace";
  const byLine = params.actorName?.trim()
    ? ` by ${params.actorName.trim()}`
    : "";
  const listHref = "/app/leads?period=all";

  const REPORT_LIMIT = 30;
  const reportLines = leads.slice(0, REPORT_LIMIT).map((lead, index) => {
    const parts = [
      leadLabel(lead),
      lead.phone?.trim() || null,
      lead.status.replaceAll("_", " ").toLowerCase(),
      lead.requirement?.trim() || null,
    ].filter((part) => part !== null);
    return `${index + 1}. ${parts.join(" · ")}`;
  });
  if (count > REPORT_LIMIT) {
    reportLines.push(`…and ${count - REPORT_LIMIT} more`);
  }

  await prisma.userAppNotification
    .create({
      data: {
        userId: assignee.id,
        organizationId: params.organizationId,
        kind: "LEAD_ASSIGNED",
        title: `${count} lead${count === 1 ? "" : "s"} assigned to you`,
        body: leads
          .slice(0, 3)
          .map((lead) => leadLabel(lead))
          .join(", ") + (count > 3 ? ` +${count - 3} more` : ""),
        href: listHref,
      },
    })
    .catch((error) => console.error("[lead-bulk-notify] in-app", error));

  const summaryText = [
    `${count} lead${count === 1 ? "" : "s"} in ${orgName} ${count === 1 ? "was" : "were"} assigned to you${byLine}.`,
    "",
    "Assignment report:",
    ...reportLines,
    "",
    `Open your leads: ${getLoginBaseUrl()}${listHref}`,
  ];

  if (assignee.email) {
    await sendPlainEmail({
      toEmail: assignee.email,
      subject: `${count} lead${count === 1 ? "" : "s"} assigned to you — ${orgName}`,
      text: [`Hi ${assignee.name?.trim() || "there"},`, "", ...summaryText].join(
        "\n",
      ),
    }).catch((error) => console.error("[lead-bulk-notify] email", error));
  }

  const assigneePhone = assignee.phone?.trim();
  if (assigneePhone) {
    await sendWhatsAppText({
      organizationId: params.organizationId,
      toPhone: assigneePhone,
      body: [
        `*${count} lead${count === 1 ? "" : "s"} assigned to you*`,
        `Hi ${assignee.name?.trim() || "there"}, ${summaryText[0]}`,
        reportLines.join("\n"),
        `Open your leads: ${getLoginBaseUrl()}${listHref}`,
      ].join("\n\n"),
    }).catch((error) => console.error("[lead-bulk-notify] whatsapp", error));
  }
}

/**
 * Notify workspace OWNER/ADMIN members that a new lead arrived and needs
 * assignment: in-app bell + email (best-effort, never throws).
 */
export async function notifyOwnersNewLead(params: {
  organizationId: string;
  leadId: string;
  channel?: string | null;
  /** Skip notifying the person who created the lead themselves. */
  actorUserId?: string | null;
}) {
  const [lead, admins] = await Promise.all([
    prisma.inboundLead.findFirst({
      where: { id: params.leadId, organizationId: params.organizationId },
      select: {
        name: true,
        phone: true,
        company: true,
        requirement: true,
        assignedToId: true,
      },
    }),
    prisma.membership.findMany({
      where: {
        organizationId: params.organizationId,
        role: { in: ["OWNER", "ADMIN"] },
        deactivatedAt: null,
      },
      select: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  if (!lead) {
    return;
  }

  const recipients = admins
    .map((row) => row.user)
    .filter((member) => member.id !== params.actorUserId);
  if (recipients.length === 0) {
    return;
  }

  const label = leadLabel(lead);
  const href = leadCrmHref(params.leadId);
  const channelLabel = params.channel
    ? params.channel.toLowerCase().replaceAll("_", " ")
    : null;
  const needsAssign = !lead.assignedToId;

  await prisma.userAppNotification
    .createMany({
      data: recipients.map((member) => ({
        userId: member.id,
        organizationId: params.organizationId,
        kind: "LEAD_NEW",
        title: needsAssign ? "New lead — assign it" : "New lead",
        body: channelLabel ? `${label} · via ${channelLabel}` : label,
        href,
      })),
    })
    .catch((error) => console.error("[lead-notify] in-app owners", error));

  const text = [
    `A new lead just came in${channelLabel ? ` via ${channelLabel}` : ""}.`,
    "",
    `Lead: ${label}`,
    lead.phone?.trim() ? `Phone: ${lead.phone.trim()}` : null,
    lead.requirement?.trim() ? `Requirement: ${lead.requirement.trim()}` : null,
    "",
    needsAssign
      ? "It is unassigned — open the CRM to assign it to your team:"
      : "Open it in the CRM:",
    `${getLoginBaseUrl()}${href}`,
  ].filter((line) => line !== null);

  await Promise.all(
    recipients
      .filter((member) => member.email)
      .map((member) =>
        sendPlainEmail({
          toEmail: member.email,
          subject: `New lead — ${label}`,
          text: [`Hi ${member.name?.trim() || "there"},`, "", ...text].join(
            "\n",
          ),
        }).catch((error) => console.error("[lead-notify] email owners", error)),
      ),
  );
}
