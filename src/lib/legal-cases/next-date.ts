import type { Prisma } from "@prisma/client";

export function hasTrackableNextDate(value: string | null | undefined) {
  const next = value?.trim() ?? "";
  if (!next) {
    return false;
  }
  return !/^(old|sunny|n\/a|na|-)$/i.test(next);
}

export function trackableNextDateWhere(): Prisma.LegalCaseWhereInput {
  return {
    AND: [
      { nextDate: { not: null } },
      { NOT: { nextDate: { equals: "", mode: "insensitive" } } },
      { NOT: { nextDate: { equals: "-", mode: "insensitive" } } },
      { NOT: { nextDate: { equals: "old", mode: "insensitive" } } },
      { NOT: { nextDate: { equals: "sunny", mode: "insensitive" } } },
      { NOT: { nextDate: { equals: "n/a", mode: "insensitive" } } },
      { NOT: { nextDate: { equals: "na", mode: "insensitive" } } },
    ],
  };
}
