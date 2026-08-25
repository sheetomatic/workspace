import type { WhatsAppApiPlanKind } from "@prisma/client";
import {
  officialWhatsappPlans,
  whatsappPlansPage,
} from "@/lib/content/whatsapp-plans-content";
import { addUtcDays, startOfUtcDay } from "@/lib/billing/dates";
import { rupeesToPaise } from "@/lib/billing/money";

export type WhatsAppApiPlanOption = {
  id: string;
  kind: WhatsAppApiPlanKind;
  label: string;
  amountPaise: number;
  durationDays: number;
  durationLabel: string;
};

const UNOFFICIAL_DURATION_DAYS: Record<string, number> = {
  "plan-4k-1m": 30,
  "plan-unlimited-1m": 30,
  "plan-12k-3m": 90,
  "plan-10k-1y": 365,
  "plan-24k-6m": 180,
  "plan-48k-1y": 365,
  "plan-unlimited-1y": 365,
};

export const CUSTOM_WHATSAPP_API_PLAN_ID = "custom";

export function unofficialWhatsAppApiPlans(): WhatsAppApiPlanOption[] {
  return whatsappPlansPage.plans.map((plan) => ({
    id: plan.id,
    kind: "UNOFFICIAL",
    label: `${plan.messages} messages · ${plan.duration}`,
    amountPaise: rupeesToPaise(plan.price),
    durationDays: UNOFFICIAL_DURATION_DAYS[plan.id] ?? 30,
    durationLabel: plan.duration,
  }));
}

export function officialWhatsAppApiPlans(): WhatsAppApiPlanOption[] {
  return officialWhatsappPlans.plans.map((plan) => ({
    id: plan.id,
    kind: "OFFICIAL",
    label: plan.title,
    amountPaise: rupeesToPaise(plan.price),
    durationDays: plan.cycle === "yearly" ? 365 : 30,
    durationLabel: plan.validityLabel,
  }));
}

export function whatsAppApiPlanOptions(): WhatsAppApiPlanOption[] {
  return [...officialWhatsAppApiPlans(), ...unofficialWhatsAppApiPlans()];
}

export function resolveWhatsAppApiPlan(planId: string) {
  return whatsAppApiPlanOptions().find((plan) => plan.id === planId) ?? null;
}

export function isMonthlyWhatsAppDuration(days: number) {
  return days > 0 && days <= 31;
}

export function expiryFromStart(startedAt: Date, durationDays: number) {
  return addUtcDays(startOfUtcDay(startedAt), Math.max(1, durationDays));
}

export function nextExpiryAfterRecharge(
  expiresAt: Date,
  durationDays: number,
  now = new Date(),
) {
  const today = startOfUtcDay(now);
  const base = startOfUtcDay(expiresAt) >= today ? startOfUtcDay(expiresAt) : today;
  return addUtcDays(base, Math.max(1, durationDays));
}

export function whatsAppApiRechargePay() {
  return {
    upiId: whatsappPlansPage.payment.upiId,
    payeeName: whatsappPlansPage.payment.payeeName,
    phoneDisplay: whatsappPlansPage.contact.phoneDisplay,
  };
}
