import { describe, expect, it } from "vitest";
import { rupeesToPaise } from "@/lib/billing/money";
import {
  getLicensedKit,
  isKitInstallAllowed,
  kitInvoiceCharges,
  kitInvoiceLabel,
  licensedKitKeyForPreset,
  listShippableFmsKits,
} from "@/lib/addons/licensed-kits";
import { getFmsIntakeFormTemplate } from "@/lib/fms/form-templates";
import { getFmsWorkflowTemplate } from "@/lib/fms/workflow-templates";

describe("licensed kits catalog", () => {
  it("ships only the workshop job card FMS kit first", () => {
    const shippable = listShippableFmsKits();
    expect(shippable.map((kit) => kit.key)).toEqual(["workshop-job-card"]);
    expect(getLicensedKit("workshop-job-card")?.priceMonthlyInr).toBe(999);
  });

  it("gates install on ACTIVE only", () => {
    expect(isKitInstallAllowed("ACTIVE")).toBe(true);
    expect(isKitInstallAllowed("REQUESTED")).toBe(false);
    expect(isKitInstallAllowed("PAST_DUE")).toBe(false);
    expect(isKitInstallAllowed(null)).toBe(false);
  });

  it("maps the workshop preset to a paid kit key", () => {
    expect(licensedKitKeyForPreset("workshop-job-card")).toBe("workshop-job-card");
    expect(licensedKitKeyForPreset("sales-order")).toBeNull();
  });

  it("bills requested and active kits on the invoice", () => {
    const lines = kitInvoiceCharges(
      [
        {
          kitKey: "workshop-job-card",
          status: "REQUESTED",
          billingPeriod: "MONTHLY",
          ratePaise: 0,
        },
        {
          kitKey: "workshop-job-card",
          status: "CANCELLED",
          billingPeriod: "MONTHLY",
          ratePaise: 0,
        },
      ],
      "MONTHLY",
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.label).toBe(kitInvoiceLabel("Repair Workshop Job Card FMS"));
    expect(lines[0]?.amountPaise).toBe(rupeesToPaise(999));
  });

  it("provisions a real workshop job card workflow and intake form", () => {
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
