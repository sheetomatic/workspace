import { prisma } from "@/lib/db";
import { listWebsitePricingProducts } from "@/lib/leads/website-pricing-catalog";

export type ServiceCatalogSeed = {
  serviceCategory: string;
  subCategory: string;
  unitPrice?: number;
  perUserCost?: number;
  durationDays?: number;
};

/** Compare category / service names without case, punctuation, or extra spaces. */
export function normalizeServiceCatalogLabel(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[—–−]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function serviceCatalogUniquenessKey(
  serviceCategory: string,
  subCategory: string,
) {
  return `${normalizeServiceCatalogLabel(serviceCategory)}|||${normalizeServiceCatalogLabel(subCategory)}`;
}

export function uniqueServiceCatalogSeeds(seeds: ServiceCatalogSeed[]) {
  const seen = new Set<string>();
  const unique: ServiceCatalogSeed[] = [];
  for (const item of seeds) {
    const key = serviceCatalogUniquenessKey(
      item.serviceCategory,
      item.subCategory,
    );
    if (!key.startsWith("|||") && !key.endsWith("|||") && !seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique;
}

/** Legacy Sheetomatic catalog rows kept as extra standards. */
export const DEFAULT_SERVICE_CATALOG: ServiceCatalogSeed[] = [
  { serviceCategory: "Training", subCategory: "Google Sheets", unitPrice: 15000 },
  { serviceCategory: "Training", subCategory: "AppSheet", unitPrice: 18000 },
  { serviceCategory: "Training", subCategory: "Looker Studio", unitPrice: 12000 },
  { serviceCategory: "Developement", subCategory: "Google Sheets", unitPrice: 45000 },
  { serviceCategory: "Custom AppSheet App Developement", subCategory: "AppSheet", unitPrice: 85000 },
  { serviceCategory: "Dashboard Preparation", subCategory: "Looker Studio", unitPrice: 35000 },
  { serviceCategory: "Developement", subCategory: "Apps Script + Google Sheets", unitPrice: 55000 },
  { serviceCategory: "MIS Service", subCategory: "Monthly", unitPrice: 15000, durationDays: 30 },
  { serviceCategory: "MIS Service", subCategory: "Quarterly", unitPrice: 40000, durationDays: 90 },
  { serviceCategory: "Remote DME Services", subCategory: "10 Hours - Monthly", unitPrice: 10000, durationDays: 30 },
  { serviceCategory: "Remote DME Services", subCategory: "20 Hours - Monthly", unitPrice: 20000, durationDays: 30 },
  { serviceCategory: "Remote DME Services", subCategory: "30 Hours - Monthly", unitPrice: 30000, durationDays: 30 },
  { serviceCategory: "Remote DME Services", subCategory: "40 Hours - Monthly", unitPrice: 35000, durationDays: 30 },
];

function periodDurationDays(period: "monthly" | "annual" | "one_time") {
  if (period === "annual") return 365;
  if (period === "monthly") return 30;
  return undefined;
}

export function websitePricingToCatalogSeeds(): ServiceCatalogSeed[] {
  return listWebsitePricingProducts().map((item) => ({
    serviceCategory: item.category,
    subCategory: item.name,
    unitPrice: item.defaultAmount > 0 ? item.defaultAmount : undefined,
    perUserCost: item.defaultPerUserCost ?? undefined,
    durationDays: periodDurationDays(item.period),
  }));
}

/** Website /pricing + /whatsapp-plans first, then legacy catalog extras. */
export function standardServiceCatalogSeeds(): ServiceCatalogSeed[] {
  const website = websitePricingToCatalogSeeds();
  const used = new Set(
    website.map((item) =>
      serviceCatalogUniquenessKey(item.serviceCategory, item.subCategory),
    ),
  );
  const extras = DEFAULT_SERVICE_CATALOG.filter(
    (item) =>
      !used.has(
        serviceCatalogUniquenessKey(item.serviceCategory, item.subCategory),
      ),
  );
  return uniqueServiceCatalogSeeds([...website, ...extras]);
}

type CatalogDedupeRow = {
  id: string;
  serviceCategory: string;
  subCategory: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  unitPrice: { toNumber(): number } | number | null;
};

function catalogKeeperScore(item: CatalogDedupeRow) {
  const price =
    item.unitPrice == null
      ? 0
      : typeof item.unitPrice === "number"
        ? item.unitPrice
        : item.unitPrice.toNumber();
  return (
    (item.isActive ? 1000 : 0) +
    (price > 0 ? 100 : 0) -
    item.sortOrder +
    (Number.MAX_SAFE_INTEGER - item.createdAt.getTime()) / 1e15
  );
}

/** Keep one row per normalized category + service; move lead links off the extras. */
export async function dedupeLeadServiceCatalog(organizationId: string) {
  const existing = await prisma.leadServiceCatalog.findMany({
    where: { organizationId },
    select: {
      id: true,
      serviceCategory: true,
      subCategory: true,
      sortOrder: true,
      isActive: true,
      createdAt: true,
      unitPrice: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const groups = new Map<string, CatalogDedupeRow[]>();
  for (const item of existing) {
    const key = serviceCatalogUniquenessKey(
      item.serviceCategory,
      item.subCategory,
    );
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  const extraIds: string[] = [];
  for (const rows of groups.values()) {
    if (rows.length < 2) {
      continue;
    }
    const ranked = [...rows].sort(
      (a, b) => catalogKeeperScore(b) - catalogKeeperScore(a),
    );
    extraIds.push(...ranked.slice(1).map((item) => item.id));
  }

  if (extraIds.length === 0) {
    return { removed: 0 };
  }

  const keepersByExtra = new Map<string, string>();
  for (const rows of groups.values()) {
    if (rows.length < 2) {
      continue;
    }
    const ranked = [...rows].sort(
      (a, b) => catalogKeeperScore(b) - catalogKeeperScore(a),
    );
    const keeperId = ranked[0]?.id;
    if (!keeperId) {
      continue;
    }
    for (const extra of ranked.slice(1)) {
      keepersByExtra.set(extra.id, keeperId);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const [extraId, keeperId] of keepersByExtra) {
      await tx.inboundLeadOfferedService.updateMany({
        where: { organizationId, catalogId: extraId },
        data: { catalogId: keeperId },
      });
    }
    await tx.leadServiceCatalog.deleteMany({
      where: { organizationId, id: { in: extraIds } },
    });
  });

  return { removed: extraIds.length };
}

export async function ensureLeadServiceCatalog(organizationId: string) {
  await dedupeLeadServiceCatalog(organizationId);

  const existing = await prisma.leadServiceCatalog.findMany({
    where: { organizationId },
    select: { serviceCategory: true, subCategory: true, sortOrder: true },
  });

  const existingKeys = new Set(
    existing.map((item) =>
      serviceCatalogUniquenessKey(item.serviceCategory, item.subCategory),
    ),
  );
  const missing = standardServiceCatalogSeeds().filter(
    (item) =>
      !existingKeys.has(
        serviceCatalogUniquenessKey(item.serviceCategory, item.subCategory),
      ),
  );

  if (missing.length === 0) {
    return;
  }

  const maxSort = existing.reduce((max, item) => Math.max(max, item.sortOrder), -1);

  await prisma.leadServiceCatalog.createMany({
    data: missing.map((item, index) => ({
      organizationId,
      serviceCategory: item.serviceCategory,
      subCategory: item.subCategory,
      unitPrice: item.unitPrice ?? null,
      perUserCost: item.perUserCost ?? null,
      durationDays: item.durationDays ?? null,
      isActive: true,
      sortOrder: existing.length === 0 ? index : maxSort + 1 + index,
    })),
    skipDuplicates: true,
  });
}

export async function listLeadServiceCatalog(
  organizationId: string,
  options?: { includeInactive?: boolean },
) {
  await ensureLeadServiceCatalog(organizationId);
  return prisma.leadServiceCatalog.findMany({
    where: {
      organizationId,
      ...(options?.includeInactive ? {} : { isActive: true }),
    },
    orderBy: [{ serviceCategory: "asc" }, { sortOrder: "asc" }, { subCategory: "asc" }],
  });
}

export function findCatalogByUniquenessKey<
  T extends { serviceCategory: string; subCategory: string },
>(items: T[], serviceCategory: string, subCategory: string) {
  const key = serviceCatalogUniquenessKey(serviceCategory, subCategory);
  return (
    items.find(
      (item) =>
        serviceCatalogUniquenessKey(item.serviceCategory, item.subCategory) ===
        key,
    ) ?? null
  );
}

export function serializeServiceCatalogItem(item: {
  id: string;
  serviceCategory: string;
  subCategory: string;
  unitPrice: { toNumber(): number } | number | null;
  perUserCost?: { toNumber(): number } | number | null;
  durationDays?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}) {
  const money = (value: { toNumber(): number } | number | null | undefined) => {
    if (value == null) return null;
    return typeof value === "number" ? value : value.toNumber();
  };
  return {
    id: item.id,
    serviceCategory: item.serviceCategory,
    subCategory: item.subCategory,
    unitPrice: money(item.unitPrice),
    perUserCost: money(item.perUserCost),
    durationDays: item.durationDays ?? null,
    isActive: item.isActive ?? true,
    sortOrder: item.sortOrder ?? 0,
  };
}
