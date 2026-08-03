import { prisma } from "@/lib/db";
import { sendPlainEmail } from "@/lib/integrations/email";
import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";
import { LEAD_STATUS_LABELS } from "@/lib/leads/status-labels";
import { ACTIVE_TASK_STATUSES, formatTaskDue } from "@/lib/tasks";
import type { InboundLeadStatus } from "@prisma/client";

const CLOSED_LEAD_STATUSES: InboundLeadStatus[] = ["WON", "LOST"];
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const CRM_HREF = "/app/leads?period=all";

/** Start of the current day in IST, as a UTC Date. */
function istDayStart(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

function istDateKey(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** One send per org per IST day, guarded by a RateLimitBucket row. */
async function claimDigestSlot(organizationId: string) {
  const key = `leads-daily-digest:${organizationId}:${istDateKey()}`;
  try {
    await prisma.rateLimitBucket.create({
      data: {
        key,
        count: 1,
        resetAt: new Date(Date.now() + 36 * 60 * 60 * 1000),
      },
    });
    return true;
  } catch {
    return false;
  }
}

function statusLabel(status: InboundLeadStatus) {
  return LEAD_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

async function deliverDigest(params: {
  organizationId: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
  kind: string;
  title: string;
  lines: string[];
}) {
  const { user } = params;
  const link = `${getLoginBaseUrl()}${CRM_HREF}`;

  await prisma.userAppNotification
    .create({
      data: {
        userId: user.id,
        organizationId: params.organizationId,
        kind: params.kind,
        title: params.title,
        body: params.lines[0] ?? "",
        href: CRM_HREF,
      },
    })
    .catch((error) => console.error("[leads-digest] in-app", error));

  if (user.email) {
    await sendPlainEmail({
      toEmail: user.email,
      subject: params.title,
      text: [
        `Hi ${user.name?.trim() || "there"},`,
        "",
        ...params.lines,
        "",
        `Open the CRM: ${link}`,
      ].join("\n"),
    }).catch((error) => console.error("[leads-digest] email", error));
  }

  const phone = user.phone?.trim();
  if (phone) {
    await sendWhatsAppText({
      organizationId: params.organizationId,
      toPhone: phone,
      body: [
        `*${params.title}*`,
        params.lines.join("\n"),
        `Open the CRM: ${link}`,
      ].join("\n\n"),
    }).catch((error) => console.error("[leads-digest] whatsapp", error));
  }
}

/**
 * Morning digest for one organization:
 * - OWNER/ADMIN get a workspace leads overview (new yesterday, unassigned,
 *   pipeline by status, follow-ups due today).
 * - Each team member with assigned leads or open tasks gets their own
 *   day-start summary of leads to work and tasks due.
 */
async function runOrgLeadsDigest(organizationId: string) {
  const todayStart = istDayStart();
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const now = new Date();

  const openLeadWhere = {
    organizationId,
    archivedAt: null,
    status: { notIn: CLOSED_LEAD_STATUSES },
  };

  const [organization, memberships, newYesterday, unassignedOpen, byStatus, followUpsToday] =
    await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      }),
      prisma.membership.findMany({
        where: { organizationId, deactivatedAt: null },
        select: {
          role: true,
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      }),
      prisma.inboundLead.count({
        where: {
          organizationId,
          createdAt: { gte: yesterdayStart, lt: todayStart },
        },
      }),
      prisma.inboundLead.count({
        where: { ...openLeadWhere, assignedToId: null },
      }),
      prisma.inboundLead.groupBy({
        by: ["status"],
        where: openLeadWhere,
        _count: { _all: true },
      }),
      prisma.inboundLeadFollowUp.count({
        where: {
          organizationId,
          completedAt: null,
          scheduledAt: { gte: todayStart, lt: tomorrowStart },
        },
      }),
    ]);

  if (!organization || memberships.length === 0) {
    return { owners: 0, members: 0 };
  }

  const orgName = organization.name?.trim() || "your workspace";
  const dateLabel = new Date(now.getTime() + IST_OFFSET_MS).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );

  let owners = 0;
  let members = 0;

  const statusLines = byStatus
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 8)
    .map((row) => `- ${statusLabel(row.status)}: ${row._count._all}`);

  const ownerRecipients = memberships.filter(
    (m) => m.role === "OWNER" || m.role === "ADMIN",
  );
  for (const membership of ownerRecipients) {
    await deliverDigest({
      organizationId,
      user: membership.user,
      kind: "LEAD_DIGEST_OWNER",
      title: `Leads digest — ${orgName} (${dateLabel})`,
      lines: [
        `New leads yesterday: ${newYesterday}`,
        `Unassigned open leads: ${unassignedOpen}${unassignedOpen > 0 ? " — assign them to the team" : ""}`,
        `Follow-ups due today: ${followUpsToday}`,
        "",
        "Open pipeline by status:",
        ...(statusLines.length > 0 ? statusLines : ["- No open leads"]),
      ],
    });
    owners += 1;
  }

  for (const membership of memberships) {
    const member = membership.user;
    const [myLeads, myLeadCount, myFollowUpsToday, myTasks] = await Promise.all([
      prisma.inboundLead.findMany({
        where: { ...openLeadWhere, assignedToId: member.id },
        select: { name: true, phone: true, company: true, status: true },
        orderBy: { modifiedAt: "asc" },
        take: 8,
      }),
      prisma.inboundLead.count({
        where: { ...openLeadWhere, assignedToId: member.id },
      }),
      prisma.inboundLeadFollowUp.count({
        where: {
          organizationId,
          assigneeUserId: member.id,
          completedAt: null,
          scheduledAt: { lt: tomorrowStart },
        },
      }),
      prisma.delegatedTask.findMany({
        where: {
          organizationId,
          assigneeUserId: member.id,
          status: { in: ACTIVE_TASK_STATUSES },
        },
        select: { title: true, dueAt: true },
        orderBy: { dueAt: "asc" },
        take: 5,
      }),
    ]);

    if (myLeadCount === 0 && myTasks.length === 0) {
      continue;
    }

    const leadLines = myLeads.map((lead, index) => {
      const label =
        lead.name?.trim() || lead.company?.trim() || lead.phone?.trim() || "Lead";
      return `${index + 1}. ${label} · ${statusLabel(lead.status)}`;
    });
    if (myLeadCount > myLeads.length) {
      leadLines.push(`…and ${myLeadCount - myLeads.length} more`);
    }

    const taskLines = myTasks.map((task) => {
      const overdue = task.dueAt.getTime() < now.getTime();
      return `- ${task.title} — due ${formatTaskDue(task.dueAt)}${overdue ? " (OVERDUE)" : ""}`;
    });

    await deliverDigest({
      organizationId,
      user: member,
      kind: "LEAD_DIGEST_MEMBER",
      title: `Your day plan — ${orgName} (${dateLabel})`,
      lines: [
        `Leads on your plate: ${myLeadCount} · follow-ups due today or overdue: ${myFollowUpsToday}`,
        ...(leadLines.length > 0 ? ["", "Your leads:", ...leadLines] : []),
        ...(taskLines.length > 0 ? ["", "Your tasks:", ...taskLines] : []),
      ],
    });
    members += 1;
  }

  return { owners, members };
}

/** Entry point for the daily cron. Best-effort per organization. */
export async function runLeadsDailyDigest() {
  const orgs = await prisma.inboundLead.groupBy({
    by: ["organizationId"],
    _count: { _all: true },
  });

  let sentOwners = 0;
  let sentMembers = 0;
  let skippedOrgs = 0;

  for (const org of orgs) {
    if (!(await claimDigestSlot(org.organizationId))) {
      skippedOrgs += 1;
      continue;
    }
    try {
      const result = await runOrgLeadsDigest(org.organizationId);
      sentOwners += result.owners;
      sentMembers += result.members;
    } catch (error) {
      console.error("[leads-digest] org failed", org.organizationId, error);
    }
  }

  return { organizations: orgs.length, sentOwners, sentMembers, skippedOrgs };
}
