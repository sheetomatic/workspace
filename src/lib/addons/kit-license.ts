import "server-only";

import type { LicensedKitStatus, PlanBillingPeriod } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getLicensedKit,
  isKitInstallAllowed,
  kitInvoiceCharges,
  type LicensedKitBillingRow,
} from "@/lib/addons/licensed-kits";

export async function listOrganizationKitLicenses(organizationId: string) {
  return prisma.organizationLicensedKit.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOrganizationKitLicense(
  organizationId: string,
  kitKey: string,
) {
  return prisma.organizationLicensedKit.findUnique({
    where: { organizationId_kitKey: { organizationId, kitKey } },
  });
}

export async function orgHasActiveKitLicense(
  organizationId: string,
  kitKey: string,
) {
  const row = await getOrganizationKitLicense(organizationId, kitKey);
  return isKitInstallAllowed(row?.status);
}

export function toKitBillingRows(
  rows: Array<{
    kitKey: string;
    status: LicensedKitStatus;
    billingPeriod: PlanBillingPeriod;
    ratePaise: number;
  }>,
): LicensedKitBillingRow[] {
  return rows.map((row) => ({
    kitKey: row.kitKey,
    status: row.status,
    billingPeriod: row.billingPeriod,
    ratePaise: row.ratePaise,
  }));
}

export function organizationKitInvoiceCharges(
  rows: Array<{
    kitKey: string;
    status: LicensedKitStatus;
    billingPeriod: PlanBillingPeriod;
    ratePaise: number;
  }>,
  orgBillingPeriod: PlanBillingPeriod = "MONTHLY",
) {
  return kitInvoiceCharges(toKitBillingRows(rows), orgBillingPeriod);
}

export async function requestKitLicense(input: {
  organizationId: string;
  kitKey: string;
  billingPeriod?: PlanBillingPeriod;
}) {
  const kit = getLicensedKit(input.kitKey);
  if (!kit || kit.kind !== "fms_kit" || !kit.shippable) {
    return { ok: false as const, message: "This kit is not for sale yet." };
  }

  const existing = await getOrganizationKitLicense(
    input.organizationId,
    kit.key,
  );
  if (existing?.status === "ACTIVE") {
    return { ok: true as const, alreadyActive: true as const, license: existing };
  }
  if (existing?.status === "REQUESTED") {
    return {
      ok: true as const,
      alreadyActive: false as const,
      license: existing,
    };
  }

  const billingPeriod = input.billingPeriod ?? "MONTHLY";
  const license = await prisma.organizationLicensedKit.upsert({
    where: {
      organizationId_kitKey: {
        organizationId: input.organizationId,
        kitKey: kit.key,
      },
    },
    create: {
      organizationId: input.organizationId,
      kitKey: kit.key,
      status: "REQUESTED",
      billingPeriod,
    },
    update: {
      status: "REQUESTED",
      billingPeriod,
      cancelledAt: null,
    },
  });

  return { ok: true as const, alreadyActive: false as const, license };
}

export async function grantKitLicense(input: {
  organizationId: string;
  kitKey: string;
  grantedByUserId: string;
  billingPeriod?: PlanBillingPeriod;
  ratePaise?: number;
  notes?: string | null;
}) {
  const kit = getLicensedKit(input.kitKey);
  if (!kit || kit.kind !== "fms_kit" || !kit.shippable) {
    return { ok: false as const, message: "Unknown kit." };
  }

  const now = new Date();
  const billingPeriod = input.billingPeriod ?? "MONTHLY";
  const renewalAt = new Date(now);
  if (billingPeriod === "ANNUAL") {
    renewalAt.setUTCFullYear(renewalAt.getUTCFullYear() + 1);
  } else {
    renewalAt.setUTCMonth(renewalAt.getUTCMonth() + 1);
  }

  const license = await prisma.organizationLicensedKit.upsert({
    where: {
      organizationId_kitKey: {
        organizationId: input.organizationId,
        kitKey: kit.key,
      },
    },
    create: {
      organizationId: input.organizationId,
      kitKey: kit.key,
      status: "ACTIVE",
      billingPeriod,
      ratePaise: input.ratePaise ?? 0,
      activatedAt: now,
      renewalAt,
      grantedByUserId: input.grantedByUserId,
      notes: input.notes ?? null,
    },
    update: {
      status: "ACTIVE",
      billingPeriod,
      ratePaise: input.ratePaise ?? 0,
      activatedAt: now,
      renewalAt,
      cancelledAt: null,
      grantedByUserId: input.grantedByUserId,
      notes: input.notes ?? null,
    },
  });

  return { ok: true as const, license };
}

export async function cancelKitLicense(input: {
  organizationId: string;
  kitKey: string;
}) {
  const existing = await getOrganizationKitLicense(
    input.organizationId,
    input.kitKey,
  );
  if (!existing) {
    return { ok: false as const, message: "No license on this workspace." };
  }

  const license = await prisma.organizationLicensedKit.update({
    where: { id: existing.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
  return { ok: true as const, license };
}

export async function activateRequestedKitsForOrganization(
  organizationId: string,
  renewalAt: Date,
) {
  const now = new Date();
  const result = await prisma.organizationLicensedKit.updateMany({
    where: { organizationId, status: "REQUESTED" },
    data: {
      status: "ACTIVE",
      activatedAt: now,
      renewalAt,
      cancelledAt: null,
    },
  });
  return result.count;
}
