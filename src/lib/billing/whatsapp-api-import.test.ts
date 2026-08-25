import { describe, expect, it } from "vitest";
import {
  mergeWhatsAppApiNotes,
  parseWhatsAppApiClientInput,
  whatsAppApiPhoneKeys,
} from "@/lib/billing/whatsapp-api-clients";
import {
  matchWhatsAppApiImportPlan,
  parseWhatsAppApiClientRows,
  parseWhatsAppApiImportDate,
} from "@/lib/billing/whatsapp-api-import";
import { CUSTOM_WHATSAPP_API_PLAN_ID } from "@/lib/billing/whatsapp-api-plans";
import { whatsAppApiClientCsvTemplate } from "@/lib/billing/whatsapp-api-import-template";

describe("WhatsApp API client import", () => {
  it("matches official and unofficial plan ids and names", () => {
    expect(matchWhatsAppApiImportPlan({ plan: "official-basic-monthly" })).toEqual({
      ok: true,
      planId: "official-basic-monthly",
    });
    expect(matchWhatsAppApiImportPlan({ plan: "Basic Plan - Monthly" }).ok).toBe(true);
    expect(matchWhatsAppApiImportPlan({ plan: "unlimited 1 month" })).toEqual({
      ok: true,
      planId: "plan-unlimited-1m",
    });
    expect(matchWhatsAppApiImportPlan({ amount: "1250" })).toEqual({
      ok: true,
      planId: "official-basic-monthly",
    });
  });

  it("treats amount + days as a custom plan", () => {
    expect(
      matchWhatsAppApiImportPlan({
        plan: "custom",
        kind: "Unofficial",
        amount: "4500",
        days: "45",
      }),
    ).toEqual({
      ok: true,
      planId: CUSTOM_WHATSAPP_API_PLAN_ID,
      planKind: "UNOFFICIAL",
      customLabel: undefined,
    });
  });

  it("reads Indian dates", () => {
    expect(parseWhatsAppApiImportDate("25/08/2026")).toBe("2026-08-25");
    expect(parseWhatsAppApiImportDate("2026-08-25")).toBe("2026-08-25");
  });

  it("parses the template and keeps expiry when provided", () => {
    const csv = whatsAppApiClientCsvTemplate();
    const rows = csv.split("\n").map((line) => line.split(","));
    const parsed = parseWhatsAppApiClientRows(rows);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0]?.planId).toBe("official-basic-monthly");
    expect(parsed.rows[1]?.planId).toBe("plan-unlimited-1m");
    expect(parsed.rows[2]?.planId).toBe(CUSTOM_WHATSAPP_API_PLAN_ID);

    const withExpiry = parseWhatsAppApiClientInput(parsed.rows[0]!);
    expect(withExpiry.ok).toBe(true);
    if (!withExpiry.ok) return;
    expect(withExpiry.value.expiresAt.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });

  it("accepts Client Name / WhatsApp aliases", () => {
    const parsed = parseWhatsAppApiClientRows([
      ["Client Name", "WhatsApp", "Plan"],
      ["Neeraj", "98765 43210", "official-standard-monthly"],
    ]);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows[0]?.name).toBe("Neeraj");
    expect(parsed.rows[0]?.planId).toBe("official-standard-monthly");
  });

  it("reads a panel export: Regular is active, the rest are inactive", () => {
    const parsed = parseWhatsAppApiClientRows([
      ["Customers List"],
      [
        "Id",
        "Username",
        "Contact",
        "Account Type",
        "Active Upto",
        "Credit Points",
        "Email",
        "Creation Time",
      ],
      [
        "50989",
        "NathSarso",
        "919199097195",
        "Regular",
        "2027-08-19 10:09:50",
        "9709",
        "contact@nathelectricworks.com",
        "2026-08-17 18:22:40",
      ],
      [
        "49130",
        "Pay10",
        "919311090583",
        "Inactive",
        "",
        "0",
        "sunildurgapal7@gmail.com",
        "2026-04-09 12:22:52",
      ],
    ]);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]).toMatchObject({
      externalId: "50989",
      name: "NathSarso",
      accountGroup: "REGULAR",
      expiresAt: "2027-08-19",
      allowZeroAmount: true,
    });
    expect(parsed.rows[1]).toMatchObject({
      externalId: "49130",
      accountGroup: "INACTIVE",
    });
    const regular = parseWhatsAppApiClientInput(parsed.rows[0]!);
    expect(regular.ok).toBe(true);
    if (regular.ok) {
      expect(regular.value.status).toBe("ACTIVE");
      expect(regular.value.expiresAt.toISOString()).toBe("2027-08-19T00:00:00.000Z");
    }
  });

  it("treats the same WhatsApp number as one client", () => {
    expect(whatsAppApiPhoneKeys("98765 43210")).toEqual([
      "919876543210",
      "9876543210",
    ]);
    expect(whatsAppApiPhoneKeys("919876543210")).toEqual([
      "919876543210",
      "9876543210",
    ]);
    expect(mergeWhatsAppApiNotes("Panel #100", "Panel #100 · 12 credits")).toBe(
      "Panel #100 · 12 credits",
    );
    expect(mergeWhatsAppApiNotes("Panel #100", "Panel #100")).toBe("Panel #100");
  });
});
