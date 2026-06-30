import type { InboundLeadStatus } from "@prisma/client";
import { withDbRetry } from "@/lib/db";
import {
  categorizeLeadRequirement,
  migrateLegacyLeadCategory,
  type LeadCategoryId,
} from "@/lib/leads/categories";
import { migrateLegacyLeadStatus } from "@/lib/leads/status-labels";
import { inferLeadStageFromRequirement } from "@/lib/leads/stage-ai";

const CATEGORY_BATCH = 25;
const AI_STATUS_BATCH = 25;

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

/** Background maintenance: small batches, sequential writes. */
export async function runLeadsBackgroundMaintenance(organizationId: string) {
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
}
