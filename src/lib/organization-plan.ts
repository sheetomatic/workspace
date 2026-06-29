import type {
  OrgPlan,
  PlanBillingPeriod,
  PlanSubscriptionStatus,
  WorkspaceModule,
} from "@prisma/client";
import { prisma } from "@/lib/db";

export type OrganizationPlanSnapshot = {
  plan: OrgPlan;
  status: PlanSubscriptionStatus;
  billingPeriod: PlanBillingPeriod;
  trialEndsAt: Date | null;
  renewalAt: Date | null;
  activatedAt: Date | null;
};

type EntitlementPatch = {
  plan: OrgPlan;
  allowedModules: WorkspaceModule[];
  maxMembers: number;
  maxFmsTemplates: number;
  status?: PlanSubscriptionStatus;
  billingPeriod?: PlanBillingPeriod;
  trialEndsAt?: Date | null;
  renewalAt?: Date | null;
  activatedAt?: Date | null;
};

/** Read plan lifecycle from OrganizationPlan, falling back to Organization columns. */
export async function getOrganizationPlanSnapshot(
  organizationId: string,
): Promise<OrganizationPlanSnapshot | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      planStatus: true,
      billingPeriod: true,
      organizationPlan: {
        select: {
          plan: true,
          status: true,
          billingPeriod: true,
          trialEndsAt: true,
          renewalAt: true,
          activatedAt: true,
        },
      },
    },
  });

  if (!organization) {
    return null;
  }

  if (organization.organizationPlan) {
    return organization.organizationPlan;
  }

  return {
    plan: organization.plan,
    status: organization.planStatus,
    billingPeriod: organization.billingPeriod,
    trialEndsAt: null,
    renewalAt: null,
    activatedAt: null,
  };
}

/** Keep OrganizationPlan in sync when entitlements change on Organization. */
export async function syncOrganizationPlanRecord(
  organizationId: string,
  patch?: Partial<
    Pick<
      EntitlementPatch,
      "status" | "billingPeriod" | "trialEndsAt" | "renewalAt" | "activatedAt"
    >
  >,
) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      planStatus: true,
      billingPeriod: true,
      status: true,
    },
  });

  if (!organization) {
    return;
  }

  await prisma.organizationPlan.upsert({
    where: { organizationId },
    create: {
      organizationId,
      plan: organization.plan,
      status: patch?.status ?? organization.planStatus,
      billingPeriod: patch?.billingPeriod ?? organization.billingPeriod,
      trialEndsAt: patch?.trialEndsAt ?? null,
      renewalAt: patch?.renewalAt ?? null,
      activatedAt:
        patch?.activatedAt ??
        (organization.status === "ACTIVE" ? new Date() : null),
    },
    update: {
      plan: organization.plan,
      status: patch?.status ?? organization.planStatus,
      billingPeriod: patch?.billingPeriod ?? organization.billingPeriod,
      trialEndsAt: patch?.trialEndsAt,
      renewalAt: patch?.renewalAt,
      activatedAt: patch?.activatedAt,
    },
  });
}

/** Apply entitlements to Organization and mirror plan metadata on OrganizationPlan. */
export async function applyOrganizationEntitlements(
  organizationId: string,
  data: EntitlementPatch,
) {
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        plan: data.plan,
        allowedModules: data.allowedModules,
        maxMembers: data.maxMembers,
        maxFmsTemplates: data.maxFmsTemplates,
        planStatus: data.status,
        billingPeriod: data.billingPeriod,
      },
    });

    await tx.organizationPlan.upsert({
      where: { organizationId },
      create: {
        organizationId,
        plan: data.plan,
        status: data.status ?? "ACTIVE",
        billingPeriod: data.billingPeriod ?? "MONTHLY",
        trialEndsAt: data.trialEndsAt ?? null,
        renewalAt: data.renewalAt ?? null,
        activatedAt: data.activatedAt ?? new Date(),
      },
      update: {
        plan: data.plan,
        status: data.status,
        billingPeriod: data.billingPeriod,
        trialEndsAt: data.trialEndsAt,
        renewalAt: data.renewalAt,
        activatedAt: data.activatedAt,
      },
    });
  });
}
