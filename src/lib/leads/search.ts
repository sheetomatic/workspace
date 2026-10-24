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

/** Search formatting only; never rewrite stored numbers or truncate foreign numbers. */
export function phoneSearchDigits(raw: string) {
  if (!/^[+\d\s().-]+$/.test(raw.trim())) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 3) return "";
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 14 && digits.startsWith("0091")) return digits.slice(4);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

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

  const digits = phoneSearchDigits(q);
  if (digits) {
    const phoneDigits = (lead.phone ?? "").replace(/\D/g, "");
    return phoneDigits.includes(digits);
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
    { city: { contains: q, mode: "insensitive" } },
  ];

  const digits = phoneSearchDigits(q);
  if (digits) {
    or.push({ phone: { contains: digits } });
  }

  return { OR: or };
}
