import { prisma } from "@/lib/db";
import { getAiDashboardStats } from "@/lib/ai-dashboard-stats";

/** Returning workspaces skip the 5-step wizard. New signups still see it once. */
export async function shouldSkipAiOnboarding(organizationId: string) {
  const [stats, settings] = await Promise.all([
    getAiDashboardStats(organizationId),
    prisma.workspaceWhatsAppSettings.findUnique({
      where: { organizationId },
      select: {
        botLiveAt: true,
        lastInboundAt: true,
        redlavaApiKey: true,
        redlavaPhoneId: true,
      },
    }),
  ]);

  return (
    stats.organizationActive ||
    stats.integrationsConnected ||
    stats.isLive ||
    stats.contacts > 0 ||
    stats.openConversations > 0 ||
    stats.knowledgeSources > 0 ||
    Boolean(settings?.botLiveAt) ||
    Boolean(settings?.lastInboundAt) ||
    Boolean(settings?.redlavaApiKey) ||
    Boolean(settings?.redlavaPhoneId)
  );
}

export async function needsAiOnboarding(organizationId: string) {
  return !(await shouldSkipAiOnboarding(organizationId));
}
