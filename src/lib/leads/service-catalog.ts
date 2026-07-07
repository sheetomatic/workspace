import { prisma } from "@/lib/db";

export type ServiceCatalogSeed = {
  serviceCategory: string;
  subCategory: string;
  unitPrice?: number;
  durationDays?: number;
};

/** Default Sheetomatic service catalog (from Categories / Sub Cat sheet). */
export const DEFAULT_SERVICE_CATALOG: ServiceCatalogSeed[] = [
  { serviceCategory: "Training", subCategory: "Google Sheets", unitPrice: 15000 },
  { serviceCategory: "Training", subCategory: "AppSheet", unitPrice: 18000 },
  { serviceCategory: "Training", subCategory: "Looker Studio", unitPrice: 12000 },
  { serviceCategory: "WEB | WhatsApp API - Recharge", subCategory: "10000 Credits 1 Year", unitPrice: 10000, durationDays: 365 },
  { serviceCategory: "WEB | WhatsApp API - Recharge", subCategory: "Unlimited 1 Year", unitPrice: 24000, durationDays: 365 },
  { serviceCategory: "WEB | WhatsApp API - Recharge", subCategory: "Unlimited 1 Month", unitPrice: 4000, durationDays: 30 },
  { serviceCategory: "WEB | WhatsApp API - Integration", subCategory: "API Setup + Credit 10000 Credits 1 Year", unitPrice: 25000, durationDays: 365 },
  { serviceCategory: "Official WhatsApp API - Integration + Credits", subCategory: "Basic Plan - Monthly | 1250", unitPrice: 1250, durationDays: 30 },
  { serviceCategory: "Official WhatsApp API - Integration + Credits", subCategory: "Standard Plan - Monthly | 2500", unitPrice: 2500, durationDays: 30 },
  { serviceCategory: "Official WhatsApp API - Integration + Credits", subCategory: "Advance Plan - Monthly | 3750", unitPrice: 3750, durationDays: 30 },
  { serviceCategory: "Official WhatsApp API - Integration + Credits", subCategory: "Basic Plan - Yearly | 19999", unitPrice: 19999, durationDays: 365 },
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

export async function ensureLeadServiceCatalog(organizationId: string) {
  const existing = await prisma.leadServiceCatalog.findMany({
    where: { organizationId },
    select: { serviceCategory: true, subCategory: true, sortOrder: true },
  });

  const existingKeys = new Set(
    existing.map((item) => `${item.serviceCategory}|||${item.subCategory}`),
  );
  const missing = DEFAULT_SERVICE_CATALOG.filter(
    (item) => !existingKeys.has(`${item.serviceCategory}|||${item.subCategory}`),
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
      durationDays: item.durationDays ?? null,
      sortOrder: existing.length === 0 ? index : maxSort + 1 + index,
    })),
    skipDuplicates: true,
  });
}

export async function listLeadServiceCatalog(organizationId: string) {
  await ensureLeadServiceCatalog(organizationId);
  return prisma.leadServiceCatalog.findMany({
    where: { organizationId },
    orderBy: [{ serviceCategory: "asc" }, { sortOrder: "asc" }],
  });
}
