import type { TaskAiRoute } from "@prisma/client";
import { prisma } from "@/lib/db";
import { taskAiDailyOrgLimit } from "@/lib/integrations/task-ai-guard";

export type TaskAiUsageSummary = {
  enabled: boolean;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  parseToday: number;
  transcribeToday: number;
  tokensToday: number;
  dayLabel: string;
};

export function startOfCalendarDayIst(reference = new Date()) {
  const dayLabel = reference.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
  return new Date(`${dayLabel}T00:00:00+05:30`);
}

export function defaultTaskAiDailyLimit() {
  return taskAiDailyOrgLimit();
}

export async function getOrCreateTaskAiSettings(organizationId: string) {
  const existing = await prisma.workspaceTaskAiSettings.findUnique({
    where: { organizationId },
  });
  if (existing) {
    return existing;
  }

  return prisma.workspaceTaskAiSettings.create({
    data: {
      organizationId,
      dailyLimit: defaultTaskAiDailyLimit(),
      enabled: true,
    },
  });
}

export async function getTaskAiUsageSummary(
  organizationId: string,
): Promise<TaskAiUsageSummary> {
  const settings = await getOrCreateTaskAiSettings(organizationId);
  const since = startOfCalendarDayIst();

  const [usedToday, parseToday, transcribeToday, tokenAgg] = await Promise.all([
    prisma.taskAiUsageEvent.count({
      where: { organizationId, createdAt: { gte: since } },
    }),
    prisma.taskAiUsageEvent.count({
      where: {
        organizationId,
        route: "PARSE",
        createdAt: { gte: since },
      },
    }),
    prisma.taskAiUsageEvent.count({
      where: {
        organizationId,
        route: "TRANSCRIBE",
        createdAt: { gte: since },
      },
    }),
    prisma.taskAiUsageEvent.aggregate({
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
    parseToday,
    transcribeToday,
    tokensToday: tokenAgg._sum.totalTokens ?? 0,
    dayLabel: since.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
    }),
  };
}

export async function checkTaskAiOrgQuota(organizationId: string) {
  const settings = await getOrCreateTaskAiSettings(organizationId);
  if (!settings.enabled) {
    return {
      allowed: false,
      message:
        "Task AI is disabled for this workspace. Contact your admin or Sheetomatic.",
    };
  }

  const summary = await getTaskAiUsageSummary(organizationId);
  if (summary.usedToday >= settings.dailyLimit) {
    return {
      allowed: false,
      message:
        "Daily Task AI limit reached for this workspace. Try again tomorrow or ask an admin to raise the limit in Settings.",
    };
  }

  return { allowed: true, message: "" };
}

export async function recordTaskAiUsage(input: {
  organizationId: string;
  userId: string;
  route: "parse" | "transcribe";
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    audioBytes?: number;
  };
}) {
  const route: TaskAiRoute =
    input.route === "parse" ? "PARSE" : "TRANSCRIBE";

  await prisma.taskAiUsageEvent.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      route,
      promptTokens: input.usage?.promptTokens ?? 0,
      completionTokens: input.usage?.completionTokens ?? 0,
      totalTokens: input.usage?.totalTokens ?? 0,
      audioBytes: input.usage?.audioBytes ?? 0,
    },
  });

  console.info(
    JSON.stringify({
      event: "task_ai_usage",
      route: input.route,
      organizationId: input.organizationId,
      userId: input.userId,
      ...input.usage,
      at: new Date().toISOString(),
    }),
  );
}

export async function updateTaskAiSettings(
  organizationId: string,
  input: { dailyLimit: number; enabled: boolean },
) {
  const dailyLimit = Math.min(10_000, Math.max(1, Math.floor(input.dailyLimit)));

  return prisma.workspaceTaskAiSettings.upsert({
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
