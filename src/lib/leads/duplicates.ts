import type {
  InboundLeadStatus,
  LeadSourceChannel,
  LeadTemperature,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { leadPhoneDigits } from "@/lib/leads/contact-validation";

export type DuplicateLeadMatch = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: InboundLeadStatus;
  channel: LeadSourceChannel;
  archivedAt: Date | null;
  score: number | null;
  temperature: LeadTemperature | null;
};

function normalizeEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase() ?? "";
  if (!value || !value.includes("@")) {
    return null;
  }
  return value;
}

function phonesMatch(a: string | null | undefined, bDigits: string): boolean {
  const aDigits = leadPhoneDigits(a);
  if (!aDigits) {
    return false;
  }
  if (aDigits === bDigits) {
    return true;
  }
  const aTail = aDigits.slice(-10);
  const bTail = bDigits.slice(-10);
  return aTail.length === 10 && bTail.length === 10 && aTail === bTail;
}

/**
 * Find org leads that share a normalized phone and/or email.
 * Does not filter archived — callers decide whether to surface them.
 */
export async function findDuplicateLeads(
  organizationId: string,
  opts: {
    phone?: string | null;
    email?: string | null;
    excludeLeadId?: string;
  },
): Promise<DuplicateLeadMatch[]> {
  const phoneDigits = leadPhoneDigits(opts.phone);
  const emailNorm = normalizeEmail(opts.email);

  if (!phoneDigits && !emailNorm) {
    return [];
  }

  const or: Array<{ phone?: { contains: string }; email?: { equals: string; mode: "insensitive" } }> =
    [];

  if (phoneDigits) {
    const tail = phoneDigits.slice(-10);
    or.push({ phone: { contains: tail } });
    if (phoneDigits !== tail) {
      or.push({ phone: { contains: phoneDigits } });
    }
  }

  if (emailNorm) {
    or.push({ email: { equals: emailNorm, mode: "insensitive" } });
  }

  const candidates = await prisma.inboundLead.findMany({
    where: {
      organizationId,
      ...(opts.excludeLeadId ? { id: { not: opts.excludeLeadId } } : {}),
      OR: or,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      status: true,
      channel: true,
      archivedAt: true,
      score: true,
      temperature: true,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return candidates.filter((row) => {
    const phoneHit = phoneDigits ? phonesMatch(row.phone, phoneDigits) : false;
    const emailHit =
      emailNorm && row.email
        ? row.email.trim().toLowerCase() === emailNorm
        : false;
    return phoneHit || emailHit;
  });
}
