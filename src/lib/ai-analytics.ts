import { prisma } from "@/lib/db";

function startOfTodayIst() {
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  istNow.setUTCHours(0, 0, 0, 0);
  return new Date(istNow.getTime() - istOffsetMs);
}

export async function getAiAnalyticsMetrics(organizationId: string) {
  const since = startOfTodayIst();

  const [
    inboundToday,
    outboundAiToday,
    outboundHumanToday,
    hotLeads,
    openConversations,
    settings,
  ] = await Promise.all([
    prisma.waMessage.count({
      where: {
        organizationId,
        direction: "INBOUND",
        createdAt: { gte: since },
      },
    }),
    prisma.waMessage.count({
      where: {
        organizationId,
        direction: "OUTBOUND",
        aiGenerated: true,
        createdAt: { gte: since },
      },
    }),
    prisma.waMessage.count({
      where: {
        organizationId,
        direction: "OUTBOUND",
        aiGenerated: false,
        createdAt: { gte: since },
      },
    }),
    prisma.waContact.count({
      where: {
        organizationId,
        OR: [
          { intent: { contains: "hot", mode: "insensitive" } },
          { leadCaptureComplete: true, unreadCount: { gt: 0 } },
        ],
      },
    }),
    prisma.waConversation.count({
      where: { organizationId, status: "OPEN" },
    }),
    prisma.workspaceWhatsAppSettings.findUnique({
      where: { organizationId },
      select: { botLiveAt: true },
    }),
  ]);

  const outboundToday = outboundAiToday + outboundHumanToday;
  const aiResolvedPct =
    inboundToday > 0
      ? Math.round((outboundAiToday / inboundToday) * 100)
      : null;

  const recentPairs = await prisma.waMessage.findMany({
    where: {
      organizationId,
      direction: "INBOUND",
      createdAt: { gte: since },
    },
    select: {
      conversationId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  let responseSamples = 0;
  let responseTotalMs = 0;

  for (const inbound of recentPairs) {
    const reply = await prisma.waMessage.findFirst({
      where: {
        organizationId,
        conversationId: inbound.conversationId,
        direction: "OUTBOUND",
        createdAt: { gt: inbound.createdAt },
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    if (reply) {
      responseSamples += 1;
      responseTotalMs +=
        reply.createdAt.getTime() - inbound.createdAt.getTime();
    }
  }

  const avgResponseSec =
    responseSamples > 0
      ? Math.round(responseTotalMs / responseSamples / 1000)
      : null;

  return {
    isLive: Boolean(settings?.botLiveAt),
    inboundToday,
    outboundToday,
    outboundAiToday,
    aiResolvedPct,
    hotLeads,
    openConversations,
    avgResponseSec,
  };
}
