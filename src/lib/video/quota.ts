import { prisma } from "@/lib/db";
import { startOfCalendarDayIst } from "@/lib/integrations/task-ai-settings";

/** Engineering default analogue of Task AI daily org cap. Not a required env var. */
export const VIDEO_DAILY_ORG_LIMIT = 5;

export async function countVideoJobsToday(organizationId: string) {
  const since = startOfCalendarDayIst();
  return prisma.videoJob.count({
    where: { organizationId, createdAt: { gte: since } },
  });
}

export async function checkVideoOrgQuota(organizationId: string) {
  const usedToday = await countVideoJobsToday(organizationId);
  if (usedToday >= VIDEO_DAILY_ORG_LIMIT) {
    return {
      allowed: false,
      message:
        "Daily video limit reached for this workspace. Try again tomorrow.",
    };
  }
  return { allowed: true, message: "" };
}
