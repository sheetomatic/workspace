import { prisma } from "@/lib/db";
import { getAiAnalyticsMetrics } from "@/lib/ai-analytics";
import { getAiDashboardStats } from "@/lib/ai-dashboard-stats";
import { hasMinimumRole } from "@/lib/permissions";
import {
  listWhatsAppMembers,
  resolveWorkspaceWhatsAppCredentials,
} from "@/lib/whatsapp-settings";
import { getWhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";

export async function getCampaignRelatedSetup(organizationId: string) {
  const [members, credentials, goLive, templateCounts, stats] =
    await Promise.all([
      listWhatsAppMembers(organizationId),
      resolveWorkspaceWhatsAppCredentials(organizationId),
      getWhatsAppGoLiveStatus(organizationId),
      prisma.whatsAppTemplate.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true },
      }),
      getAiDashboardStats(organizationId),
    ]);

  const managers = members.filter(
    (member) => member.phone && hasMinimumRole(member.role, "MANAGER"),
  );

  const approvedTemplates =
    templateCounts.find((row) => row.status === "APPROVED")?._count._all ?? 0;
  const pendingTemplates =
    templateCounts.find((row) => row.status === "PENDING")?._count._all ?? 0;

  const apiKeyReady = Boolean(credentials.redlavaApiKey);
  const phoneIdReady = Boolean(credentials.redlavaPhoneId);

  return {
    credentials,
    goLive,
    stats,
    managers,
    managerCount: managers.length,
    approvedTemplates,
    pendingTemplates,
    settingsReady: apiKeyReady && phoneIdReady,
    apiKeyReady,
    phoneIdReady,
    canSend: goLive.credentialsReady,
  };
}

export async function getAiAgentsOverview(organizationId: string) {
  const [stats, leadCapturePending, lowConfidenceToday] = await Promise.all([
    getAiDashboardStats(organizationId),
    prisma.waContact.count({
      where: {
        organizationId,
        leadCaptureComplete: false,
        pipelineStage: { notIn: ["WON", "LOST"] },
      },
    }),
    prisma.waMessage.count({
      where: {
        organizationId,
        direction: "OUTBOUND",
        aiGenerated: true,
        aiConfidence: { lt: 0.65 },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  return {
    ...stats,
    leadCapturePending,
    lowConfidenceToday,
  };
}

export async function getExtendedAnalytics(organizationId: string) {
  const base = await getAiAnalyticsMetrics(organizationId);

  const [pipeline, unreadLeads, overdueFollowUps, weekInbound] =
    await Promise.all([
      prisma.waContact.groupBy({
        by: ["pipelineStage"],
        where: { organizationId },
        _count: { _all: true },
      }),
      prisma.waContact.count({
        where: { organizationId, unreadCount: { gt: 0 } },
      }),
      prisma.waContactFollowUp.count({
        where: {
          organizationId,
          completedAt: null,
          scheduledAt: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.waMessage.count({
        where: {
          organizationId,
          direction: "INBOUND",
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

  const pipelineMap = Object.fromEntries(
    pipeline.map((row) => [row.pipelineStage, row._count._all]),
  ) as Record<string, number>;

  return {
    ...base,
    outboundHumanToday: base.outboundToday - base.outboundAiToday,
    pipelineMap,
    unreadLeads,
    overdueFollowUps,
    weekInbound,
  };
}

export async function getSupportHubQueue(organizationId: string) {
  const [stats, unreadContacts, overdueFollowUps, needsReply] =
    await Promise.all([
      getAiDashboardStats(organizationId),
      prisma.waContact.findMany({
        where: { organizationId, unreadCount: { gt: 0 } },
        orderBy: [{ unreadCount: "desc" }, { lastMessageAt: "desc" }],
        take: 8,
        select: {
          id: true,
          name: true,
          phone: true,
          unreadCount: true,
          pipelineStage: true,
          conversations: {
            where: { status: "OPEN" },
            take: 1,
            select: { id: true },
          },
        },
      }),
      prisma.waContactFollowUp.findMany({
        where: {
          organizationId,
          completedAt: null,
          scheduledAt: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        include: {
          contact: {
            select: {
              id: true,
              name: true,
              phone: true,
              conversations: {
                where: { status: "OPEN" },
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      }),
      prisma.waConversation.findMany({
        where: {
          organizationId,
          status: "OPEN",
          contact: { unreadCount: { gt: 0 } },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 5,
        select: {
          id: true,
          preview: true,
          lastMessageAt: true,
          contact: {
            select: { name: true, phone: true, unreadCount: true },
          },
        },
      }),
    ]);

  return {
    stats,
    unreadContacts,
    overdueFollowUps,
    needsReply,
    queueTotal:
      unreadContacts.length + overdueFollowUps.length,
  };
}

export type WorkflowStatus = "live" | "paused" | "setup" | "active";

export async function getWorkflowStatuses(organizationId: string) {
  const [stats, goLive, approvedTemplates, openFollowUps, delegatedTasks] =
    await Promise.all([
      getAiDashboardStats(organizationId),
      getWhatsAppGoLiveStatus(organizationId),
      prisma.whatsAppTemplate.count({
        where: { organizationId, status: "APPROVED" },
      }),
      prisma.waContactFollowUp.count({
        where: { organizationId, completedAt: null },
      }),
      prisma.delegatedTask.count({
        where: {
          organizationId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
    ]);

  const connected = stats.integrationsConnected;

  return {
    stats,
    goLive,
    approvedTemplates,
    openFollowUps,
    delegatedTasks,
    workflows: [
      {
        id: "customer-ai",
        name: "Customer AI replies",
        description: "Auto-answer inbound WhatsApp from your training data.",
        trigger: "Inbound message",
        status: (stats.isLive ? "live" : connected ? "paused" : "setup") as WorkflowStatus,
        href: "/ai/app/campaign",
        actionLabel: stats.isLive ? "Manage Go Live" : "Go Live",
        metric: stats.knowledgeSources > 0 ? `${stats.knowledgeSources} sources` : "Add training",
      },
      {
        id: "lead-capture",
        name: "Lead profile capture",
        description: "Collect name, email, city, and requirement on WhatsApp.",
        trigger: "New contact",
        status: (stats.isLive ? "live" : "setup") as WorkflowStatus,
        href: "/ai/app/ai-brain",
        actionLabel: "View agent",
        metric: "5-step form",
      },
      {
        id: "task-delegation",
        name: "Task delegation",
        description: "Managers assign tasks via WhatsApp to team members.",
        trigger: "Manager message",
        status: (connected ? "active" : "setup") as WorkflowStatus,
        href: "/ai/app/settings",
        actionLabel: "Team numbers",
        metric: `${goLive.delegatorCount} managers`,
      },
      {
        id: "crm-followups",
        name: "CRM follow-ups",
        description: "Schedule next dates and track overdue sales follow-ups.",
        trigger: "Manual in CRM",
        status: "active" as WorkflowStatus,
        href: "/ai/app/contacts",
        actionLabel: "Open CRM",
        metric: openFollowUps > 0 ? `${openFollowUps} scheduled` : "None yet",
      },
      {
        id: "template-alerts",
        name: "Template notifications",
        description: "Approved templates for task assign and reminders.",
        trigger: "Task events",
        status: (approvedTemplates > 0 ? "active" : "setup") as WorkflowStatus,
        href: "/ai/app/templates",
        actionLabel: "Templates",
        metric: `${approvedTemplates} approved`,
      },
      {
        id: "human-handoff",
        name: "Human handoff",
        description: "Pause AI per contact when your team replies in Chats.",
        trigger: "Team reply",
        status: (stats.openConversations > 0 ? "active" : "paused") as WorkflowStatus,
        href: "/ai/app/inbox",
        actionLabel: "Open Chats",
        metric: `${stats.openConversations} open`,
      },
    ],
  };
}
