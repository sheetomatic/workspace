import type { OrganizationStatus, PlanSubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import { syncOrganizationPlanRecord } from "@/lib/organization-plan";

/** Demo / trial workspaces get this many calendar days of access. */
export const DEMO_TRIAL_DAYS = 3;

export function demoTrialEndsAt(from = new Date(), days = DEMO_TRIAL_DAYS) {
  const end = new Date(from.getTime());
  end.setUTCDate(end.getUTCDate() + days);
  return end;
}

/**
 * If this org is a TRIAL past trialEndsAt, put it on HOLD and cancel the trial.
 * Returns the effective organization status after the check.
 */
export async function expireDemoTrialIfNeeded(
  organizationId: string,
  now = new Date(),
): Promise<OrganizationStatus | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      status: true,
      planStatus: true,
      isPrimary: true,
      slug: true,
      organizationPlan: {
        select: { trialEndsAt: true, status: true },
      },
    },
  });
  if (!org || org.isPrimary || org.slug === PRIMARY_ORG_SLUG) {
    return org?.status ?? null;
  }

  const planStatus: PlanSubscriptionStatus =
    org.organizationPlan?.status ?? org.planStatus;
  const trialEndsAt = org.organizationPlan?.trialEndsAt ?? null;

  if (planStatus !== "TRIAL" || !trialEndsAt || trialEndsAt.getTime() > now.getTime()) {
    return org.status;
  }

  if (org.status !== "HOLD" && org.status !== "INACTIVE") {
    await prisma.organization.update({
      where: { id: org.id },
      data: { status: "HOLD", planStatus: "CANCELLED" },
    });
  } else if (org.planStatus === "TRIAL") {
    await prisma.organization.update({
      where: { id: org.id },
      data: { planStatus: "CANCELLED" },
    });
  }

  await syncOrganizationPlanRecord(org.id, {
    status: "CANCELLED",
  });

  return org.status === "INACTIVE" ? "INACTIVE" : "HOLD";
}

/** Batch expire all overdue demo trials (billing cron). */
export async function expireDueDemoTrials(now = new Date()) {
  const due = await prisma.organizationPlan.findMany({
    where: {
      status: "TRIAL",
      trialEndsAt: { lte: now },
      organization: {
        isPrimary: false,
        status: { in: ["ACTIVE", "ONBOARDING"] },
      },
    },
    select: { organizationId: true },
  });

  const expired: string[] = [];
  for (const row of due) {
    const status = await expireDemoTrialIfNeeded(row.organizationId, now);
    if (status === "HOLD" || status === "INACTIVE") {
      expired.push(row.organizationId);
    }
  }
  return { expired: expired.length, organizationIds: expired };
}
