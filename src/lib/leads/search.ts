import type { Prisma } from "@prisma/client";

export type LeadSearchable = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  requirement?: string | null;
  city?: string | null;
  category?: string | null;
};

export function leadMatchesSearchQuery(
  lead: LeadSearchable,
  raw: string | null | undefined,
): boolean {
  const q = raw?.trim().toLowerCase() ?? "";
  if (!q) {
    return false;
  }

  const haystack = [
    lead.name,
    lead.phone,
    lead.email,
    lead.company,
    lead.requirement,
    lead.city,
    lead.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (haystack.includes(q)) {
    return true;
  }

  const digits = q.replace(/\D/g, "");
  if (digits.length >= 4) {
    const phoneDigits = (lead.phone ?? "").replace(/\D/g, "");
    return phoneDigits.includes(digits.slice(-10));
  }

  return false;
}

/** Prisma OR for CRM lead search (name, phone, email, company, requirement). */
export function leadSearchWhere(
  raw: string | null | undefined,
): Prisma.InboundLeadWhereInput {
  const q = raw?.trim() ?? "";
  if (!q) {
    return {};
  }

  const or: Prisma.InboundLeadWhereInput[] = [
    { name: { contains: q, mode: "insensitive" } },
    { phone: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    { company: { contains: q, mode: "insensitive" } },
    { requirement: { contains: q, mode: "insensitive" } },
    { category: { contains: q, mode: "insensitive" } },
  ];

  const digits = q.replace(/\D/g, "");
  if (digits.length >= 4) {
    or.push({ phone: { contains: digits.slice(-10) } });
  }

  return { OR: or };
}
