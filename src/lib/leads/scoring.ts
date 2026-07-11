import type {
  InboundLeadStatus,
  LeadCallingStatus,
  LeadTemperature,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasValidLeadEmail, leadPhoneDigits } from "@/lib/leads/contact-validation";

export type LeadScoreFields = {
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  requirement?: string | null;
  status: InboundLeadStatus;
  callingStatus?: LeadCallingStatus | null;
  pipeValue?: Prisma.Decimal | number | null;
};

const STATUS_WEIGHT: Record<InboundLeadStatus, number> = {
  NEW: 5,
  SCHEDULE_MEETING: 12,
  MEETING_NOTES: 15,
  CONTACTED: 18,
  FOLLOW_UP: 20,
  QUALIFIED: 28,
  PROPOSAL: 35,
  INVOICE: 40,
  PAYMENT: 45,
  PROJECT_ACTIVE: 48,
  WON: 55,
  LOST: 0,
};

function toNumber(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) {
    return 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function temperatureFromScore(score: number): LeadTemperature {
  if (score >= 70) {
    return "HOT";
  }
  if (score >= 40) {
    return "WARM";
  }
  return "COLD";
}

/**
 * Simple rule-based lead score (0–100) + Hot/Warm/Cold.
 * Completeness + stage + call connect + pipe value.
 */
export function computeLeadScore(lead: LeadScoreFields): {
  score: number;
  temperature: LeadTemperature;
} {
  let score = 0;

  if (leadPhoneDigits(lead.phone)) {
    score += 15;
  }
  if (hasValidLeadEmail(lead.email)) {
    score += 10;
  }
  if (lead.company?.trim()) {
    score += 10;
  }
  if (lead.requirement?.trim()) {
    score += 10;
  }

  score += STATUS_WEIGHT[lead.status] ?? 0;

  if (lead.callingStatus === "CONNECTED") {
    score += 15;
  } else if (lead.callingStatus === "CALLING" || lead.callingStatus === "NO_ANSWER") {
    score += 5;
  }

  const pipe = toNumber(lead.pipeValue);
  if (pipe > 0) {
    score += 8;
  }
  if (pipe >= 50_000) {
    score += 7;
  }
  if (pipe >= 200_000) {
    score += 5;
  }

  const clamped = clampScore(score);
  return {
    score: clamped,
    temperature: temperatureFromScore(clamped),
  };
}

export async function recomputeAndSaveScore(
  leadId: string,
  organizationId: string,
): Promise<{ score: number; temperature: LeadTemperature } | null> {
  const lead = await prisma.inboundLead.findFirst({
    where: { id: leadId, organizationId },
    select: {
      phone: true,
      email: true,
      company: true,
      requirement: true,
      status: true,
      callingStatus: true,
      pipeValue: true,
    },
  });

  if (!lead) {
    return null;
  }

  const { score, temperature } = computeLeadScore(lead);

  await prisma.inboundLead.updateMany({
    where: { id: leadId, organizationId },
    data: { score, temperature },
  });

  return { score, temperature };
}
