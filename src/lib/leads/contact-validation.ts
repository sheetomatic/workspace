import type { Prisma } from "@prisma/client";

/** Minimum digits for a usable Indian mobile (allows 10-digit or 91-prefixed). */
const MIN_PHONE_DIGITS = 10;

export function leadPhoneDigits(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length < MIN_PHONE_DIGITS) {
    return null;
  }
  return digits;
}

export function hasValidLeadEmail(email: string | null | undefined): boolean {
  const value = email?.trim() ?? "";
  if (value.length < 5) {
    return false;
  }
  const at = value.indexOf("@");
  return at > 0 && at < value.length - 1;
}

/** A lead must have a contact number; email alone is not enough for CRM follow-up. */
export function leadHasRequiredContact(
  phone: string | null | undefined,
  email?: string | null | undefined,
): boolean {
  void email;
  return leadPhoneDigits(phone) !== null;
}

/** Prisma filter: only leads with a non-empty phone field (refined in app purge for digit count). */
export function inboundLeadWithPhoneWhere(): Prisma.InboundLeadWhereInput {
  return {
    AND: [{ phone: { not: null } }, { NOT: { phone: "" } }],
  };
}

/** Only the verified LinkedIn sync writes these identifiers. Missing phone is expected. */
export function linkedInLeadIdentityWhere(): Prisma.InboundLeadWhereInput {
  return {
    AND: [
      { linkedInAppId: { not: null } },
      { NOT: { linkedInAppId: "" } },
      { linkedInMemberUrn: { startsWith: "urn:li:person:" } },
      { NOT: { linkedInMemberUrn: "urn:li:person:" } },
    ],
  };
}

export function hasLinkedInLeadIdentity(lead: {
  linkedInAppId: string | null;
  linkedInMemberUrn: string | null;
}) {
  return Boolean(lead.linkedInAppId &&
    /^urn:li:person:[A-Za-z0-9_-]+$/.test(lead.linkedInMemberUrn ?? ""));
}

export function mergeLeadContactWhere(
  where: Prisma.InboundLeadWhereInput,
  options?: { includeArchived?: boolean },
): Prisma.InboundLeadWhereInput {
  const contact: Prisma.InboundLeadWhereInput = {
    AND: [{ OR: [inboundLeadWithPhoneWhere(), linkedInLeadIdentityWhere()] }],
  };
  const archived: Prisma.InboundLeadWhereInput = options?.includeArchived
    ? {}
    : { archivedAt: null, mergedIntoId: null };
  if (!where.AND) {
    return { ...where, ...contact, ...archived };
  }
  const and = Array.isArray(where.AND) ? where.AND : [where.AND];
  return {
    ...where,
    AND: [
      ...and,
      ...(contact.AND as Prisma.InboundLeadWhereInput[]),
      ...(options?.includeArchived ? [] : [archived]),
    ],
  };
}
