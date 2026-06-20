import { prisma } from "@/lib/db";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import { resolveWhatsAppTestPhone } from "@/lib/whatsapp-test-phone";
import { hasMinimumRole } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export type ResolvedWhatsAppDelegator = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  userId: string;
  userName: string;
  role: Role;
  phone: string;
};

export type ResolvedWhatsAppTeamMember = ResolvedWhatsAppDelegator;

export async function resolveOrganizationByPhoneNumberId(phoneNumberId: string) {
  const settings = await prisma.workspaceWhatsAppSettings.findFirst({
    where: { redlavaPhoneId: phoneNumberId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });

  if (settings) {
    return settings.organization;
  }

  const masSettings = await prisma.workspaceWhatsAppSettings.findFirst({
    where: {
      whatsappProvider: "MESSAGEAUTOSENDER",
      masUsername: phoneNumberId,
    },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });

  if (masSettings) {
    return masSettings.organization;
  }

  if (phoneNumberId === "mas") {
    return prisma.workspaceWhatsAppSettings.findFirst({
      where: { whatsappProvider: "MESSAGEAUTOSENDER" },
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { updatedAt: "desc" },
    }).then((row) => row?.organization ?? null);
  }

  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (envPhoneId && envPhoneId === phoneNumberId) {
    const slug = process.env.WHATSAPP_DEFAULT_ORG_SLUG?.trim();
    if (slug) {
      return prisma.organization.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true },
      });
    }

    return prisma.organization.findFirst({
      where: { isPrimary: true },
      select: { id: true, name: true, slug: true },
    });
  }

  return null;
}

function phonesMatch(stored: string | null | undefined, incoming: string) {
  if (!stored) {
    return false;
  }
  const a = normalizeWhatsAppPhone(stored);
  const b = normalizeWhatsAppPhone(incoming);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  if (a.length >= 10 && b.length >= 10 && a.slice(-10) === b.slice(-10)) {
    return true;
  }
  return false;
}

export async function resolveDelegatorByPhone(
  organizationId: string,
  fromPhone: string,
): Promise<ResolvedWhatsAppDelegator | null> {
  const member = await resolveTeamMemberByPhone(organizationId, fromPhone);
  if (!member || !hasMinimumRole(member.role, "MANAGER")) {
    return null;
  }
  return member;
}

export async function resolveTeamMemberByPhone(
  organizationId: string,
  fromPhone: string,
): Promise<ResolvedWhatsAppTeamMember | null> {
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      organization: { select: { name: true, slug: true } },
    },
  });

  for (const membership of memberships) {
    if (!phonesMatch(membership.user.phone, fromPhone)) {
      continue;
    }

    const normalized = normalizeWhatsAppPhone(fromPhone);
    if (!normalized) {
      return null;
    }

    return {
      organizationId,
      organizationName: membership.organization.name,
      organizationSlug: membership.organization.slug,
      userId: membership.user.id,
      userName: membership.user.name ?? membership.user.email.split("@")[0],
      role: membership.role,
      phone: normalized,
    };
  }

  const testPhone = resolveWhatsAppTestPhone();
  if (testPhone && phonesMatch(testPhone, fromPhone)) {
    for (const role of ["OWNER", "ADMIN", "MANAGER"] as const) {
      const membership = await prisma.membership.findFirst({
        where: { organizationId, role },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          organization: { select: { name: true, slug: true } },
        },
      });
      if (membership) {
        return {
          organizationId,
          organizationName: membership.organization.name,
          organizationSlug: membership.organization.slug,
          userId: membership.user.id,
          userName:
            membership.user.name ?? membership.user.email.split("@")[0],
          role: membership.role,
          phone: testPhone,
        };
      }
    }
  }

  return null;
}

export async function listMemberHints(organizationId: string) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name ?? m.user.email.split("@")[0],
    email: m.user.email,
  }));
}
