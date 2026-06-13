import { prisma } from "@/lib/db";

export type AiReplyUsageSummary = {
  enabled: boolean;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  handoffsToday: number;
  tokensToday: number;
  dayLabel: string;
};

export function defaultAiReplyDailyLimit() {
  const raw = Number(process.env.AI_REPLY_DAILY_ORG_LIMIT ?? "300");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 300;
}

function startOfCalendarDayIst(reference = new Date()) {
  const dayLabel = reference.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  return new Date(`${dayLabel}T00:00:00+05:30`);
}

export async function getOrCreateAiReplySettings(organizationId: string) {
  const existing = await prisma.workspaceAiReplySettings.findUnique({
    where: { organizationId },
  });
  if (existing) {
    return existing;
  }

  return prisma.workspaceAiReplySettings.create({
    data: {
      organizationId,
      dailyLimit: defaultAiReplyDailyLimit(),
      enabled: true,
    },
  });
}

export async function getAiReplyUsageSummary(
  organizationId: string,
): Promise<AiReplyUsageSummary> {
  const settings = await getOrCreateAiReplySettings(organizationId);
  const since = startOfCalendarDayIst();

  const [usedToday, handoffsToday, tokenAgg] = await Promise.all([
    prisma.aiReplyUsageEvent.count({
      where: { organizationId, createdAt: { gte: since } },
    }),
    prisma.aiReplyUsageEvent.count({
      where: {
        organizationId,
        handoff: true,
        createdAt: { gte: since },
      },
    }),
    prisma.aiReplyUsageEvent.aggregate({
      where: { organizationId, createdAt: { gte: since } },
      _sum: { totalTokens: true },
    }),
  ]);

  const remainingToday = Math.max(0, settings.dailyLimit - usedToday);

  return {
    enabled: settings.enabled,
    dailyLimit: settings.dailyLimit,
    usedToday,
    remainingToday,
    handoffsToday,
    tokensToday: tokenAgg._sum.totalTokens ?? 0,
    dayLabel: since.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
    }),
  };
}

export async function checkAiReplyOrgQuota(organizationId: string) {
  const settings = await getOrCreateAiReplySettings(organizationId);
  if (!settings.enabled) {
    return {
      allowed: false,
      message:
        "WhatsApp AI replies are disabled for this workspace. Contact your admin or Sheetomatic.",
    };
  }

  const summary = await getAiReplyUsageSummary(organizationId);
  if (summary.usedToday >= settings.dailyLimit) {
    return {
      allowed: false,
      message:
        "Daily WhatsApp AI reply limit reached for this workspace. A team member will follow up manually.",
    };
  }

  return { allowed: true, message: "" };
}

export async function recordAiReplyUsage(input: {
  organizationId: string;
  handoff?: boolean;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}) {
  await prisma.aiReplyUsageEvent.create({
    data: {
      organizationId: input.organizationId,
      handoff: Boolean(input.handoff),
      promptTokens: input.usage?.promptTokens ?? 0,
      completionTokens: input.usage?.completionTokens ?? 0,
      totalTokens: input.usage?.totalTokens ?? 0,
    },
  });

  console.info(
    JSON.stringify({
      event: "ai_reply_usage",
      organizationId: input.organizationId,
      handoff: Boolean(input.handoff),
      ...input.usage,
      at: new Date().toISOString(),
    }),
  );
}

export async function updateAiReplySettings(
  organizationId: string,
  input: { dailyLimit: number; enabled: boolean },
) {
  const dailyLimit = Math.min(10_000, Math.max(1, Math.floor(input.dailyLimit)));

  return prisma.workspaceAiReplySettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      dailyLimit,
      enabled: input.enabled,
    },
    update: {
      dailyLimit,
      enabled: input.enabled,
    },
  });
}
