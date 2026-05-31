import { prisma } from "@/lib/db";
import { normalizeWhatsAppPhone } from "@/lib/phone";
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

export async function resolveOrganizationByPhoneNumberId(phoneNumberId: string) {
  const settings = await prisma.workspaceWhatsAppSettings.findFirst({
    where: { redlavaPhoneId: phoneNumberId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });

  if (settings) {
    return settings.organization;
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
  return Boolean(a && b && a === b);
}

export async function resolveDelegatorByPhone(
  organizationId: string,
  fromPhone: string,
): Promise<ResolvedWhatsAppDelegator | null> {
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
    if (!hasMinimumRole(membership.role, "MANAGER")) {
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
