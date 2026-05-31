import { prisma } from "@/lib/db";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export async function getAiDashboardStats(organizationId: string) {
  const [
    contacts,
    openConversations,
    knowledgeSources,
    settings,
    unreadAgg,
    credentials,
    organization,
  ] = await Promise.all([
    prisma.waContact.count({ where: { organizationId } }),
    prisma.waConversation.count({
      where: { organizationId, status: "OPEN" },
    }),
    prisma.aiKnowledgeItem.count({
      where: { organizationId, status: "ACTIVE" },
    }),
    prisma.workspaceWhatsAppSettings.findUnique({
      where: { organizationId },
      select: { botLiveAt: true, businessPhone: true, redlavaPhoneId: true },
    }),
    prisma.waContact.aggregate({
      where: { organizationId },
      _sum: { unreadCount: true },
    }),
    resolveWorkspaceWhatsAppCredentials(organizationId),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { status: true, name: true },
    }),
  ]);

  const integrationsConnected = Boolean(
    credentials.redlavaApiKey &&
      (credentials.redlavaPhoneId || settings?.redlavaPhoneId),
  );

  return {
    organizationName: organization?.name ?? "Workspace",
    organizationActive: organization?.status === "ACTIVE",
    contacts,
    openConversations,
    knowledgeSources,
    unreadMessages: unreadAgg._sum.unreadCount ?? 0,
    integrationsConnected,
    isLive: Boolean(settings?.botLiveAt),
    businessPhone: settings?.businessPhone ?? null,
  };
}
