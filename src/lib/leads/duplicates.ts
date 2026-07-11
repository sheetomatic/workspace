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
  company: string | null;
  status: InboundLeadStatus;
  channel: LeadSourceChannel;
  archivedAt: Date | null;
  score: number | null;
  temperature: LeadTemperature | null;
  /** True when phone or email matched (hard). Company-only is soft. */
  matchKind: "phone" | "email" | "phone_email" | "company";
};

function normalizeEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase() ?? "";
  if (!value || !value.includes("@")) {
    return null;
  }
  return value;
}

function normalizeCompany(company: string | null | undefined): string | null {
  const value = company?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  if (value.length < 3) {
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
 * Optional company soft-match (informational — GST/PAN not on InboundLead).
 * Does not filter archived — callers decide whether to surface them.
 */
export async function findDuplicateLeads(
  organizationId: string,
  opts: {
    phone?: string | null;
    email?: string | null;
    company?: string | null;
    excludeLeadId?: string;
    /** Include company-name soft matches (default false for create/update block). */
    includeCompanySoft?: boolean;
  },
): Promise<DuplicateLeadMatch[]> {
  const phoneDigits = leadPhoneDigits(opts.phone);
  const emailNorm = normalizeEmail(opts.email);
  const companyNorm = opts.includeCompanySoft
    ? normalizeCompany(opts.company)
    : null;

  if (!phoneDigits && !emailNorm && !companyNorm) {
    return [];
  }

  const or: Array<{
    phone?: { contains: string };
    email?: { equals: string; mode: "insensitive" };
    company?: { equals: string; mode: "insensitive" };
  }> = [];

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

  if (companyNorm) {
    or.push({ company: { equals: companyNorm, mode: "insensitive" } });
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
      company: true,
      status: true,
      channel: true,
      archivedAt: true,
      score: true,
      temperature: true,
      mergedIntoId: true,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  return candidates
    .filter((row) => !row.mergedIntoId)
    .map((row) => {
      const phoneHit = phoneDigits ? phonesMatch(row.phone, phoneDigits) : false;
      const emailHit =
        emailNorm && row.email
          ? row.email.trim().toLowerCase() === emailNorm
          : false;
      const companyHit =
        companyNorm && row.company
          ? normalizeCompany(row.company) === companyNorm
          : false;

      if (!phoneHit && !emailHit && !companyHit) {
        return null;
      }
      if (!phoneHit && !emailHit) {
        if (!opts.includeCompanySoft || !companyHit) {
          return null;
        }
      }

      let matchKind: DuplicateLeadMatch["matchKind"] = "company";
      if (phoneHit && emailHit) matchKind = "phone_email";
      else if (phoneHit) matchKind = "phone";
      else if (emailHit) matchKind = "email";

      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        company: row.company,
        status: row.status,
        channel: row.channel,
        archivedAt: row.archivedAt,
        score: row.score,
        temperature: row.temperature,
        matchKind,
      };
    })
    .filter((row): row is DuplicateLeadMatch => row !== null);
}
