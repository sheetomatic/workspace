import type { InboundLeadStatus } from "@prisma/client";
import { withDbRetry } from "@/lib/db";
import { parseSheetDate } from "@/lib/integrations/google-sheets-parse";
import {
  categorizeLeadRequirement,
  migrateLegacyLeadCategory,
  type LeadCategoryId,
} from "@/lib/leads/categories";
import { leadHasRequiredContact } from "@/lib/leads/contact-validation";
import { migrateLegacyLeadStatus } from "@/lib/leads/status-labels";
import { inferLeadStageFromRequirement } from "@/lib/leads/stage-ai";
import { runLeadNurtureQueue } from "@/lib/leads/nurture/run";

const CAPTURED_AT_BACKFILL_BATCH = 50;

const CAPTURED_AT_RAW_KEYS = [
  "capturedAtRaw",
  "Timestamp",
  "timestamp",
  "Date",
  "Lead date",
  "Created",
  "Created at",
  "Submitted",
  "Time",
];

function extractCapturedAtRaw(rawPayload: unknown): string | null {
  if (!rawPayload || typeof rawPayload !== "object") {
    return null;
  }
  const raw = rawPayload as Record<string, unknown>;
  for (const key of CAPTURED_AT_RAW_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/** Backfill inquiry time from sheet raw payload when capturedAt was never parsed. */
export async function backfillLeadCapturedAt(organizationId: string): Promise<number> {
  const leads = await withDbRetry((client) =>
    client.inboundLead.findMany({
      where: {
        organizationId,
        capturedAt: null,
        channel: "GOOGLE_SHEETS",
      },
      select: { id: true, rawPayload: true },
      take: CAPTURED_AT_BACKFILL_BATCH,
      orderBy: { createdAt: "desc" },
    }),
  );

  let updated = 0;
  for (const lead of leads) {
    const raw = extractCapturedAtRaw(lead.rawPayload);
    if (!raw) {
      continue;
    }
    const parsed = parseSheetDate(raw);
    if (!parsed) {
      continue;
    }
    await withDbRetry((client) =>
      client.inboundLead.update({
        where: { id: lead.id },
        data: { capturedAt: parsed },
      }),
    );
    updated += 1;
  }
  return updated;
}

const CATEGORY_BATCH = 50;
const AI_STATUS_BATCH = 25;
const PURGE_BATCH = 100;

/** Run legacy category/status normalization without flooding the DB pool. */
export async function backfillLeadCategoriesAndStatus(organizationId: string) {
  const leadsToNormalize = await withDbRetry((client) =>
    client.inboundLead.findMany({
      where: { organizationId },
      select: { id: true, requirement: true, category: true, status: true },
      take: CATEGORY_BATCH,
    }),
  );

  for (const lead of leadsToNormalize) {
    const patch: { category?: LeadCategoryId; status?: InboundLeadStatus } = {};

    if (!lead.category) {
      patch.category = categorizeLeadRequirement(lead.requirement);
    } else {
      const migratedCategory = migrateLegacyLeadCategory(lead.category);
      if (migratedCategory && migratedCategory !== lead.category) {
        patch.category = migratedCategory;
      }
    }

    const migratedStatus = migrateLegacyLeadStatus(lead.status);
    if (migratedStatus && migratedStatus !== lead.status) {
      patch.status = migratedStatus;
    }

    if (!patch.category && !patch.status) {
      continue;
    }

    await withDbRetry((client) =>
      client.inboundLead.update({
        where: { id: lead.id },
        data: patch,
      }),
    );
  }
}

/** Fill missing AI-suggested status one row at a time (pool-safe). */
export async function backfillLeadAiSuggestedStatus(organizationId: string) {
  const missingAi = await withDbRetry((client) =>
    client.inboundLead.findMany({
      where: { organizationId, aiSuggestedStatus: null },
      select: { id: true, requirement: true },
      take: AI_STATUS_BATCH,
    }),
  );

  for (const lead of missingAi) {
    await withDbRetry((client) =>
      client.inboundLead.update({
        where: { id: lead.id },
        data: {
          aiSuggestedStatus: inferLeadStageFromRequirement(lead.requirement),
        },
      }),
    );
  }
}

/** Remove leads without a usable phone (10+ digits). Runs in small batches. */
export async function purgeLeadsWithoutContact(organizationId: string): Promise<number> {
  let total = 0;

  const emptyDeleted = await withDbRetry((client) =>
    client.inboundLead.deleteMany({
      where: {
        organizationId,
        OR: [{ phone: null }, { phone: "" }],
      },
    }),
  );
  total += emptyDeleted.count;

  let cursor: string | undefined;
  for (;;) {
    const batch = await withDbRetry((client) =>
      client.inboundLead.findMany({
        where: { organizationId },
        select: { id: true, phone: true },
        take: PURGE_BATCH,
        orderBy: { id: "asc" },
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      }),
    );

    if (batch.length === 0) {
      break;
    }

    const invalidIds = batch
      .filter((lead) => !leadHasRequiredContact(lead.phone))
      .map((lead) => lead.id);

    if (invalidIds.length > 0) {
      const deleted = await withDbRetry((client) =>
        client.inboundLead.deleteMany({
          where: { id: { in: invalidIds }, organizationId },
        }),
      );
      total += deleted.count;
    }

    cursor = batch[batch.length - 1]?.id;
    if (batch.length < PURGE_BATCH) {
      break;
    }
  }

  return total;
}

/** Background maintenance: small batches, sequential writes. */
export async function runLeadsBackgroundMaintenance(organizationId: string) {
  try {
    await purgeLeadsWithoutContact(organizationId);
  } catch (error) {
    console.error("leads contact purge", error);
  }

  try {
    await backfillLeadCapturedAt(organizationId);
  } catch (error) {
    console.error("leads capturedAt backfill", error);
  }

  try {
    await backfillLeadCategoriesAndStatus(organizationId);
  } catch (error) {
    console.error("leads category backfill", error);
  }

  try {
    await backfillLeadAiSuggestedStatus(organizationId);
  } catch (error) {
    console.error("leads ai status backfill", error);
  }

  try {
    await runLeadNurtureQueue(organizationId);
  } catch (error) {
    console.error("leads nurture queue", error);
  }
}
