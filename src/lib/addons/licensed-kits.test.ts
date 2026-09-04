import { describe, expect, it } from "vitest";
import { rupeesToPaise } from "@/lib/billing/money";
import {
  getLicensedKit,
  isKitInstallAllowed,
  kitInvoiceCharges,
  kitInvoiceLabel,
  licensedKitKeyForPreset,
  listShippableFmsKits,
  listShippableShopKits,
  MOBILE_SHOP_KIT_KEY,
} from "@/lib/addons/licensed-kits";
import { getFmsIntakeFormTemplate } from "@/lib/fms/form-templates";
import { getFmsWorkflowTemplate } from "@/lib/fms/workflow-templates";

describe("licensed kits catalog", () => {
  it("ships the mobile shop app as the first SKU", () => {
    const shippable = listShippableShopKits();
    expect(shippable.map((kit) => kit.key)).toEqual([MOBILE_SHOP_KIT_KEY]);
    expect(listShippableFmsKits().map((kit) => kit.key)).toEqual([
      MOBILE_SHOP_KIT_KEY,
    ]);
    const kit = getLicensedKit(MOBILE_SHOP_KIT_KEY);
    expect(kit?.kind).toBe("shop_app");
    expect(kit?.priceMonthlyInr).toBe(999);
    expect(kit?.appHref).toBe("/app/mobile-shop");
    expect(kit?.name).toBe("Mobile Shop app");
    expect(kit?.description).toContain("Accessories");
    expect(kit?.description).toContain("Repairs");
    expect(kit?.description).toContain("today");
  });

  it("does not sell workshop job card, clinic, or jewellery kits", () => {
    expect(getLicensedKit("workshop-job-card")).toBeNull();
    expect(getLicensedKit("clinic")).toBeNull();
    expect(getLicensedKit("jewellery")).toBeNull();
    expect(licensedKitKeyForPreset("workshop-job-card")).toBeNull();
    expect(licensedKitKeyForPreset("sales-order")).toBeNull();
  });

  it("gates the shop on ACTIVE only", () => {
    expect(isKitInstallAllowed("ACTIVE")).toBe(true);
    expect(isKitInstallAllowed("REQUESTED")).toBe(false);
    expect(isKitInstallAllowed("PAST_DUE")).toBe(false);
    expect(isKitInstallAllowed(null)).toBe(false);
  });

  it("bills requested and active mobile shop licenses on the invoice", () => {
    const lines = kitInvoiceCharges(
      [
        {
          kitKey: MOBILE_SHOP_KIT_KEY,
          status: "REQUESTED",
          billingPeriod: "MONTHLY",
          ratePaise: 0,
        },
        {
          kitKey: MOBILE_SHOP_KIT_KEY,
          status: "CANCELLED",
          billingPeriod: "MONTHLY",
          ratePaise: 0,
        },
        {
          kitKey: "ims-module",
          status: "ACTIVE",
          billingPeriod: "MONTHLY",
          ratePaise: 0,
        },
      ],
      "MONTHLY",
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.label).toBe(kitInvoiceLabel("Mobile Shop app"));
    expect(lines[0]?.amountPaise).toBe(rupeesToPaise(999));
  });

  it("keeps workshop job card as an unused optional FMS template, not the sold SKU", () => {
    const workflow = getFmsWorkflowTemplate("workshop-job-card");
    expect(workflow?.steps.map((step) => step.stepName)).toEqual([
      "Log job",
      "Diagnose",
      "Approve estimate",
      "Repair",
      "QC / test",
      "Collect payment",
      "Deliver / close",
    ]);
    const intake = getFmsIntakeFormTemplate("workshop-job-card");
    expect(intake?.some((field) => field.label === "Serial / IMEI")).toBe(true);
    expect(intake?.some((field) => field.label === "Complaint" && field.required)).toBe(
      true,
    );
  });
});
