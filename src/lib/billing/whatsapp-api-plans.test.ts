import { describe, expect, it } from "vitest";
import {
  expiryFromStart,
  nextExpiryAfterRecharge,
  officialWhatsAppApiPlans,
  resolveWhatsAppApiPlan,
  unofficialWhatsAppApiPlans,
} from "@/lib/billing/whatsapp-api-plans";
import { parseWhatsAppApiClientInput } from "@/lib/billing/whatsapp-api-clients";
import { whatsAppApiReminderText } from "@/lib/billing/whatsapp-api-reminders";

describe("WhatsApp API plan catalog", () => {
  it("maps unofficial recharge packs to days and paise", () => {
    const monthly = resolveWhatsAppApiPlan("plan-unlimited-1m");
    expect(monthly?.kind).toBe("UNOFFICIAL");
    expect(monthly?.durationDays).toBe(30);
    expect(monthly?.amountPaise).toBe(299_900);
    expect(unofficialWhatsAppApiPlans().length).toBeGreaterThan(3);
  });

  it("maps official monthly and yearly cycles", () => {
    const monthly = resolveWhatsAppApiPlan("official-basic-monthly");
    const yearly = resolveWhatsAppApiPlan("official-basic-yearly");
    expect(monthly?.durationDays).toBe(30);
    expect(yearly?.durationDays).toBe(365);
    expect(officialWhatsAppApiPlans().some((plan) => plan.id === "official-advance-monthly")).toBe(
      true,
    );
  });
});

describe("WhatsApp API expiry", () => {
  it("sets expiry from start + plan days", () => {
    expect(expiryFromStart(new Date("2026-08-25T00:00:00.000Z"), 30).toISOString()).toBe(
      "2026-09-24T00:00:00.000Z",
    );
  });

  it("stacks a recharge from the current expiry when still active", () => {
    expect(
      nextExpiryAfterRecharge(
        new Date("2026-09-24T00:00:00.000Z"),
        30,
        new Date("2026-09-10T00:00:00.000Z"),
      ).toISOString(),
    ).toBe("2026-10-24T00:00:00.000Z");
  });

  it("starts a late recharge from today", () => {
    expect(
      nextExpiryAfterRecharge(
        new Date("2026-08-01T00:00:00.000Z"),
        30,
        new Date("2026-08-25T00:00:00.000Z"),
      ).toISOString(),
    ).toBe("2026-09-24T00:00:00.000Z");
  });
});

describe("parseWhatsAppApiClientInput", () => {
  it("normalizes an Indian mobile and Official plan", () => {
    const parsed = parseWhatsAppApiClientInput({
      name: "Neeraj",
      phone: "9876543210",
      planId: "official-basic-monthly",
      startedAt: "2026-08-25",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.phone).toBe("919876543210");
    expect(parsed.value.planKind).toBe("OFFICIAL");
    expect(parsed.value.expiresAt.toISOString()).toBe("2026-09-24T00:00:00.000Z");
  });

  it("asks for a real number and plan", () => {
    expect(
      parseWhatsAppApiClientInput({ name: "A", phone: "12", planId: "official-basic-monthly" }).ok,
    ).toBe(false);
    expect(parseWhatsAppApiClientInput({ name: "Neeraj", phone: "9876543210", planId: "" }).ok).toBe(
      false,
    );
  });

  it("uses an uploaded expiry date when present", () => {
    const parsed = parseWhatsAppApiClientInput({
      name: "Neeraj",
      phone: "9876543210",
      planId: "official-basic-monthly",
      expiresAt: "2026-09-10",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.expiresAt.toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(parsed.value.startedAt.toISOString()).toBe("2026-08-11T00:00:00.000Z");
  });
});

describe("whatsAppApiReminderText", () => {
  it("asks them to recharge before the plan ends", () => {
    const text = whatsAppApiReminderText({
      name: "Neeraj",
      planLabel: "Basic Plan - Monthly",
      amountPaise: 125_000,
      expiresAt: new Date("2026-09-24T00:00:00.000Z"),
      daysLeft: 3,
    });
    expect(text).toMatch(/Neeraj/);
    expect(text).toMatch(/3 days/);
    expect(text).toMatch(/Basic Plan - Monthly/);
    expect(text).toMatch(/paid/i);
  });
});
