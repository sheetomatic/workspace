import { prisma } from "@/lib/db";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import { computeLeadScore } from "@/lib/leads/scoring";

export type MergeInboundLeadsResult =
  | { ok: true; primaryId: string; secondaryId: string }
  | { ok: false; message: string };

function pickText(
  primary: string | null | undefined,
  secondary: string | null | undefined,
): string | null {
  const a = primary?.trim() || null;
  if (a) return a;
  return secondary?.trim() || null;
}

/**
 * Merge secondary into primary within one org.
 * Reassigns activities / follow-ups / payments / quotations / offered services / sales orders,
 * fills empty primary contact fields from secondary, then soft-archives secondary with mergedIntoId.
 * GST/PAN: not on InboundLead — deferred.
 */
export async function mergeInboundLeads(params: {
  organizationId: string;
  primaryId: string;
  secondaryId: string;
  actorUserId: string;
}): Promise<MergeInboundLeadsResult> {
  const { organizationId, primaryId, secondaryId, actorUserId } = params;

  if (primaryId === secondaryId) {
    return { ok: false, message: "Pick two different leads to merge." };
  }

  const [primary, secondary] = await Promise.all([
    prisma.inboundLead.findFirst({
      where: { id: primaryId, organizationId },
    }),
    prisma.inboundLead.findFirst({
      where: { id: secondaryId, organizationId },
    }),
  ]);

  if (!primary || !secondary) {
    return { ok: false, message: "Lead not found in this workspace." };
  }

  if (primary.mergedIntoId || secondary.mergedIntoId) {
    return { ok: false, message: "One of these leads was already merged." };
  }

  await prisma.$transaction(async (tx) => {
    // Clear unique 1:1 links on secondary before archive (keep primary's).
    if (secondary.waContactId || secondary.fmsInstanceId) {
      await tx.inboundLead.update({
        where: { id: secondaryId },
        data: {
          waContactId: null,
          fmsInstanceId: null,
        },
      });
    }

    await Promise.all([
      tx.inboundLeadActivity.updateMany({
        where: { organizationId, leadId: secondaryId },
        data: { leadId: primaryId },
      }),
      tx.inboundLeadFollowUp.updateMany({
        where: { organizationId, leadId: secondaryId },
        data: { leadId: primaryId },
      }),
      tx.inboundLeadPayment.updateMany({
        where: { organizationId, leadId: secondaryId },
        data: { leadId: primaryId },
      }),
      tx.inboundLeadQuotation.updateMany({
        where: { organizationId, leadId: secondaryId },
        data: { leadId: primaryId },
      }),
      tx.inboundLeadOfferedService.updateMany({
        where: { organizationId, leadId: secondaryId },
        data: { leadId: primaryId },
      }),
      tx.salesOrder.updateMany({
        where: { organizationId, leadId: secondaryId },
        data: { leadId: primaryId },
      }),
    ]);

    const nextFollowUpAt =
      primary.nextFollowUpAt && secondary.nextFollowUpAt
        ? primary.nextFollowUpAt < secondary.nextFollowUpAt
          ? primary.nextFollowUpAt
          : secondary.nextFollowUpAt
        : (primary.nextFollowUpAt ?? secondary.nextFollowUpAt);

    const pipeValue = primary.pipeValue ?? secondary.pipeValue;
    const quotationValue = primary.quotationValue ?? secondary.quotationValue;

    const mergedFields = {
      name: pickText(primary.name, secondary.name),
      phone: pickText(primary.phone, secondary.phone),
      email: pickText(primary.email, secondary.email),
      company: pickText(primary.company, secondary.company),
      address: pickText(primary.address, secondary.address),
      zipCode: pickText(primary.zipCode, secondary.zipCode),
      city: pickText(primary.city, secondary.city),
      requirement: pickText(primary.requirement, secondary.requirement),
      sourceDetail: pickText(primary.sourceDetail, secondary.sourceDetail),
      discussionNotes: pickText(primary.discussionNotes, secondary.discussionNotes),
      meetingNotes: pickText(primary.meetingNotes, secondary.meetingNotes),
      category: primary.category ?? secondary.category,
      campaign: pickText(primary.campaign, secondary.campaign),
      landingPage: pickText(primary.landingPage, secondary.landingPage),
      utmSource: pickText(primary.utmSource, secondary.utmSource),
      utmMedium: pickText(primary.utmMedium, secondary.utmMedium),
      utmCampaign: pickText(primary.utmCampaign, secondary.utmCampaign),
      utmContent: pickText(primary.utmContent, secondary.utmContent),
      utmTerm: pickText(primary.utmTerm, secondary.utmTerm),
      expectedCloseAt: primary.expectedCloseAt ?? secondary.expectedCloseAt,
      winProbability: primary.winProbability ?? secondary.winProbability,
      assignedToId: primary.assignedToId ?? secondary.assignedToId,
      nextFollowUpAt,
      pipeValue,
      quotationValue,
      aiSummary: pickText(primary.aiSummary, secondary.aiSummary),
      aiSummaryAt: primary.aiSummaryAt ?? secondary.aiSummaryAt,
    };

    const { score, temperature } = computeLeadScore({
      phone: mergedFields.phone,
      email: mergedFields.email,
      company: mergedFields.company,
      requirement: mergedFields.requirement,
      status: primary.status,
      callingStatus: primary.callingStatus,
      pipeValue,
    });

    await tx.inboundLead.update({
      where: { id: primaryId },
      data: {
        ...mergedFields,
        score,
        temperature,
        modifiedAt: new Date(),
      },
    });

    await tx.inboundLead.update({
      where: { id: secondaryId },
      data: {
        mergedIntoId: primaryId,
        archivedAt: new Date(),
        modifiedAt: new Date(),
      },
    });
  });

  await logInboundLeadActivity({
    organizationId,
    leadId: primaryId,
    type: "EDIT",
    body: `Merged duplicate lead ${secondary.name?.trim() || secondaryId} into this record`,
    createdByUserId: actorUserId,
    metadata: { mergedFromLeadId: secondaryId },
  });

  await logInboundLeadActivity({
    organizationId,
    leadId: secondaryId,
    type: "EDIT",
    body: `Merged into lead ${primary.name?.trim() || primaryId}`,
    createdByUserId: actorUserId,
    metadata: { mergedIntoLeadId: primaryId },
  });

  return { ok: true, primaryId, secondaryId };
}
