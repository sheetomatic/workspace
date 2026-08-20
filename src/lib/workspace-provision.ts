import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { OrganizationStatus } from "@prisma/client";
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
  resolveActivationPreset,
  activationSummaryMessage,
  isActivationBundleKey,
} from "@/lib/workspace-activation-bundles";
import { workspaceLoginHref } from "@/lib/workspace-auth-links";

export type ProvisionClientWorkspaceInput = {
  businessName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone?: string | null;
  bundle: string;
  invitedByName: string;
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
  const preset = resolveActivationPreset(bundle);
  const entitlements = organizationEntitlementsData(preset);
  const slug = await createUniqueOrganizationSlug(businessName);
  const loginUrl = workspaceLoginHref({ org: slug });
  const bundleLabel = activationSummaryMessage(preset);

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
      allowedModules: entitlements.allowedModules,
      maxMembers: entitlements.maxMembers,
      maxFmsTemplates: entitlements.maxFmsTemplates,
      isPrimary: false,
    },
    select: { id: true, name: true, slug: true },
  });

  await applyOrganizationEntitlements(organization.id, {
    ...entitlements,
    status: "ACTIVE",
    activatedAt: new Date(),
  });

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

  return {
    ok: true,
    message: `${emailStatusMessage(ownerEmail, emailResult, fallback)} ${bundleLabel}.`,
    workspaceName: organization.name,
    slug: organization.slug,
    loginUrl,
    loginEmail: ownerEmail,
    tempPassword,
    emailSent: emailResult.sent,
    existingUser: Boolean(existingUser),
    bundleLabel,
  };
}

export type ManageClientWorkspaceIntent =
  | "activate"
  | "hold"
  | "deactivate"
  | "remove";

const INTENT_STATUS: Record<
  Exclude<ManageClientWorkspaceIntent, "remove">,
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
    select: { id: true, name: true, slug: true, isPrimary: true, status: true },
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
      allowedModules: true,
      createdAt: true,
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
