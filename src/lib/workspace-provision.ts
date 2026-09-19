import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { OrganizationStatus, PlanSubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import {
  emailStatusMessage,
  sendTeamWelcomeEmail,
  sendTeamWorkspaceAccessEmail,
} from "@/lib/integrations/email";
import { createUniqueOrganizationSlug } from "@/lib/org-slug";
import { organizationEntitlementsData } from "@/lib/org-onboarding";
import { applyOrganizationEntitlements } from "@/lib/organization-plan";
import {
  ensureOnboardingTasks,
  ensureOrganizationBilling,
  markOnboardingTask,
} from "@/lib/billing/invoices";
import { monthlyPeriodFrom } from "@/lib/billing/dates";
import {
  resolveActivationPreset,
  activationSummaryMessage,
  isActivationBundleKey,
} from "@/lib/workspace-activation-bundles";
import { workspaceLoginHref } from "@/lib/workspace-auth-links";
import { DEMO_TRIAL_DAYS, demoTrialEndsAt } from "@/lib/demo-workspace";

export type ProvisionClientWorkspaceInput = {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string | null;
  bundle: string;
  invitedByName: string;
  /** 3-day trial workspace — auto-expires, then convert to paying client. */
  demoTrial?: boolean;
};

export type ProvisionClientWorkspaceResult =
  | {
      ok: true;
      message: string;
      workspaceName: string;
      slug: string;
      loginUrl: string;
      loginEmail: string;
      tempPassword?: string;
      emailSent: boolean;
      existingUser: boolean;
      bundleLabel: string;
      demoTrial?: boolean;
      trialEndsAt?: string;
    }
  | { ok: false; message: string };

export function parseProvisionWorkspaceInput(input: {
  businessName?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  bundle?: string | null;
}):
  | { ok: true; value: Omit<ProvisionClientWorkspaceInput, "invitedByName"> }
  | { ok: false; message: string } {
  const businessName = input.businessName?.trim() ?? "";
  const ownerName = input.ownerName?.trim() ?? "";
  const ownerEmail = input.ownerEmail?.trim().toLowerCase() ?? "";
  const ownerPhone = input.ownerPhone?.trim() || null;
  const bundle = input.bundle?.trim() ?? "";

  if (businessName.length < 2) {
    return { ok: false, message: "Enter the client company name." };
  }
  if (ownerName.length < 2) {
    return { ok: false, message: "Enter the owner name." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    return { ok: false, message: "Enter a valid owner email." };
  }
  if (!isActivationBundleKey(bundle)) {
    return { ok: false, message: "Choose a module bundle." };
  }

  return {
    ok: true,
    value: {
      businessName,
      ownerName,
      ownerEmail,
      ownerPhone,
      bundle,
    },
  };
}

export async function provisionClientWorkspace(
  input: ProvisionClientWorkspaceInput,
): Promise<ProvisionClientWorkspaceResult> {
  const parsed = parseProvisionWorkspaceInput(input);
  if (!parsed.ok) {
    return parsed;
  }

  const { businessName, ownerName, ownerEmail, ownerPhone, bundle } =
    parsed.value;
  const demoTrial = input.demoTrial === true;
  const preset = resolveActivationPreset(bundle);
  const entitlements = organizationEntitlementsData(preset);
  const slug = await createUniqueOrganizationSlug(
    demoTrial ? `${businessName} Demo` : businessName,
  );
  const loginUrl = workspaceLoginHref({ org: slug });
  const bundleLabel = activationSummaryMessage(preset);
  const trialEndsAt = demoTrial ? demoTrialEndsAt(new Date()) : null;

  const existingUser = await prisma.user.findUnique({
    where: { email: ownerEmail },
    select: { id: true, name: true },
  });

  const organization = await prisma.organization.create({
    data: {
      name: businessName,
      slug,
      status: "ACTIVE",
      plan: entitlements.plan,
      product: entitlements.product,
      planStatus: demoTrial ? "TRIAL" : "ACTIVE",
      allowedModules: entitlements.allowedModules,
      maxMembers: entitlements.maxMembers,
      maxFmsTemplates: entitlements.maxFmsTemplates,
      isPrimary: false,
    },
    select: { id: true, name: true, slug: true },
  });

  await applyOrganizationEntitlements(organization.id, {
    ...entitlements,
    status: demoTrial ? "TRIAL" : "ACTIVE",
    activatedAt: new Date(),
    trialEndsAt,
    renewalAt: demoTrial ? null : monthlyPeriodFrom(new Date()).dueAt,
  });
  if (!demoTrial) {
    await ensureOrganizationBilling({
      id: organization.id,
      plan: entitlements.plan,
      allowedModules: entitlements.allowedModules,
    });
  }
  await ensureOnboardingTasks(organization.id);
  await markOnboardingTask(organization.id, "workspace_created", true);
  await markOnboardingTask(organization.id, "modules_enabled", true);

  let tempPassword: string | undefined;
  let userId = existingUser?.id;

  if (existingUser) {
    const alreadyInOrg = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId: organization.id,
        },
      },
      select: { id: true },
    });
    if (!alreadyInOrg) {
      await prisma.membership.create({
        data: {
          userId: existingUser.id,
          organizationId: organization.id,
          role: "OWNER",
          modules: [...entitlements.allowedModules],
        },
      });
    }
  } else {
    tempPassword = randomBytes(12).toString("base64url");
    const created = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: ownerName,
        phone: ownerPhone,
        passwordHash: await bcrypt.hash(tempPassword, 10),
        memberships: {
          create: {
            organizationId: organization.id,
            role: "OWNER",
            modules: [...entitlements.allowedModules],
          },
        },
      },
      select: { id: true },
    });
    userId = created.id;
  }

  void userId;

  const emailResult = existingUser
    ? await sendTeamWorkspaceAccessEmail({
        toEmail: ownerEmail,
        memberName: ownerName,
        organizationName: organization.name,
        roleLabel: "Owner",
        invitedByName: input.invitedByName,
      })
    : await sendTeamWelcomeEmail({
        toEmail: ownerEmail,
        memberName: ownerName,
        organizationName: organization.name,
        roleLabel: "Owner",
        tempPassword: tempPassword!,
        invitedByName: input.invitedByName,
      });

  const fallback = existingUser
    ? `${organization.name} is ready. Owner already has a Sheetomatic login.`
    : `${organization.name} is ready. Share the login below once.`;
  const trialNote = demoTrial
    ? ` Demo trial — access until ${trialEndsAt!.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })} (${DEMO_TRIAL_DAYS} days), then auto-expires.`
    : "";

  return {
    ok: true,
    message: `${emailStatusMessage(ownerEmail, emailResult, fallback)} ${bundleLabel}.${trialNote}`,
    workspaceName: organization.name,
    slug: organization.slug,
    loginUrl,
    loginEmail: ownerEmail,
    tempPassword,
    emailSent: emailResult.sent,
    existingUser: Boolean(existingUser),
    bundleLabel,
    demoTrial,
    trialEndsAt: trialEndsAt?.toISOString(),
  };
}

export type ManageClientWorkspaceIntent =
  | "activate"
  | "hold"
  | "deactivate"
  | "remove"
  | "convert_demo";

const INTENT_STATUS: Record<
  Exclude<ManageClientWorkspaceIntent, "remove" | "convert_demo">,
  OrganizationStatus
> = {
  activate: "ACTIVE",
  hold: "HOLD",
  deactivate: "INACTIVE",
};

export async function manageClientWorkspace(input: {
  workspaceId: string;
  intent: ManageClientWorkspaceIntent;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const workspaceId = input.workspaceId.trim();
  if (!workspaceId) {
    return { ok: false, message: "Workspace not found." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      isPrimary: true,
      status: true,
      plan: true,
      product: true,
      allowedModules: true,
      maxMembers: true,
      maxFmsTemplates: true,
      planStatus: true,
      organizationPlan: {
        select: { status: true, trialEndsAt: true },
      },
    },
  });

  if (!organization) {
    return { ok: false, message: "Workspace not found." };
  }

  if (organization.isPrimary || organization.slug === PRIMARY_ORG_SLUG) {
    return { ok: false, message: "The primary Sheetomatic workspace cannot be changed here." };
  }

  if (input.intent === "remove") {
    return removeClientWorkspace(organization.id, organization.name);
  }

  if (input.intent === "convert_demo") {
    return convertDemoWorkspaceToClient(organization);
  }

  const status = INTENT_STATUS[input.intent];
  if (organization.status === status) {
    return { ok: true, message: `${organization.name} is already ${statusLabel(status)}.` };
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: { status },
  });

  if (status === "ACTIVE") {
    return { ok: true, message: `${organization.name} is active. The owner can sign in.` };
  }
  if (status === "HOLD") {
    return { ok: true, message: `${organization.name} is on hold. Staff see a hold screen.` };
  }
  return { ok: true, message: `${organization.name} is deactivated. Staff cannot use it.` };
}

async function convertDemoWorkspaceToClient(organization: {
  id: string;
  name: string;
  plan: Parameters<typeof ensureOrganizationBilling>[0]["plan"];
  product: import("@prisma/client").WorkspaceProduct;
  allowedModules: import("@prisma/client").WorkspaceModule[];
  maxMembers: number;
  maxFmsTemplates: number;
  planStatus: PlanSubscriptionStatus;
  organizationPlan: { status: PlanSubscriptionStatus; trialEndsAt: Date | null } | null;
}) {
  const planStatus =
    organization.organizationPlan?.status ?? organization.planStatus;
  const wasTrial =
    planStatus === "TRIAL" ||
    planStatus === "CANCELLED" ||
    Boolean(organization.organizationPlan?.trialEndsAt);

  if (!wasTrial && planStatus === "ACTIVE") {
    return {
      ok: true as const,
      message: `${organization.name} is already a paying client workspace.`,
    };
  }

  await applyOrganizationEntitlements(organization.id, {
    plan: organization.plan,
    product: organization.product,
    allowedModules: organization.allowedModules,
    maxMembers: organization.maxMembers,
    maxFmsTemplates: organization.maxFmsTemplates,
    status: "ACTIVE",
    trialEndsAt: null,
    activatedAt: new Date(),
    renewalAt: monthlyPeriodFrom(new Date()).dueAt,
  });
  await prisma.organization.update({
    where: { id: organization.id },
    data: { status: "ACTIVE", planStatus: "ACTIVE" },
  });
  await ensureOrganizationBilling({
    id: organization.id,
    plan: organization.plan,
    allowedModules: organization.allowedModules,
  });

  return {
    ok: true as const,
    message: `${organization.name} is now a real client — trial cleared, billing started, access active.`,
  };
}

function statusLabel(status: OrganizationStatus) {
  if (status === "ACTIVE") return "active";
  if (status === "HOLD") return "on hold";
  if (status === "INACTIVE") return "inactive";
  return "pending";
}

async function removeClientWorkspace(organizationId: string, name: string) {
  const members = await prisma.membership.findMany({
    where: { organizationId },
    select: { userId: true },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.invitation.deleteMany({ where: { organizationId } });
      await tx.organizationPlan.deleteMany({ where: { organizationId } });
      await tx.membership.deleteMany({ where: { organizationId } });
      await tx.organization.delete({ where: { id: organizationId } });
    });
  } catch {
    return {
      ok: false,
      message: `${name} has operational data, so it cannot be deleted. Deactivate it instead.`,
    };
  }

  for (const member of members) {
    const leftover = await prisma.membership.count({
      where: { userId: member.userId },
    });
    if (leftover > 0) continue;
    const user = await prisma.user.findUnique({
      where: { id: member.userId },
      select: { isSuperAdmin: true },
    });
    if (!user || user.isSuperAdmin) continue;
    try {
      await prisma.user.delete({ where: { id: member.userId } });
    } catch {
      // User still has other records — leave the login, workspace is gone.
    }
  }

  return { ok: true as const, message: `${name} was removed.` };
}

export async function listClientWorkspaces(take = 80) {
  return prisma.organization.findMany({
    where: { isPrimary: false },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      plan: true,
      planStatus: true,
      allowedModules: true,
      createdAt: true,
      organizationPlan: {
        select: { trialEndsAt: true, status: true },
      },
      memberships: {
        where: { role: "OWNER" },
        take: 1,
        select: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });
}
