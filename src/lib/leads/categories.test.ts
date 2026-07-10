import { describe, expect, it } from "vitest";
import {
  categorizeLeadRequirement,
  leadCategoryLabel,
  migrateLegacyLeadCategory,
  resolveLeadCategoryId,
} from "@/lib/leads/categories";
import { computePipeMetrics } from "@/lib/leads/pipe-metrics";

describe("categorizeLeadRequirement", () => {
  it("classifies WhatsApp unofficial API needs", () => {
    expect(categorizeLeadRequirement("Need whatsapp api plan from google sheet")).toBe(
      "WHATSAPP_API_UNOFFICIAL",
    );
  });

  it("classifies tasks management requirements", () => {
    expect(categorizeLeadRequirement("Task delegation and checklist for team")).toBe(
      "TASKS_MANAGEMENT",
    );
  });

  it("classifies GWS training", () => {
    expect(categorizeLeadRequirement("Google sheets training workshop for staff")).toBe(
      "TRAINING_GWS",
    );
  });

  it("classifies chatbot requirements as Sheetomatic AI", () => {
    expect(categorizeLeadRequirement("Chatboat set up for Customer")).toBe("SHEETOMATIC_AI");
  });

  it("returns readable labels", () => {
    expect(leadCategoryLabel("GWS_DEVELOPMENT")).toBe("GWS — Development");
    expect(leadCategoryLabel("CRM_AUTOMATION")).toBe("Custom Software");
  });

  it("migrates legacy category ids", () => {
    expect(migrateLegacyLeadCategory("CRM_AUTOMATION")).toBe("CUSTOM_SOFTWARE");
    expect(resolveLeadCategoryId("FMS_ERP")).toBe("FMS_BCI");
  });
});

describe("computePipeMetrics", () => {
  it("aggregates pipe and won values", () => {
    const metrics = computePipeMetrics([
      { status: "NEW", category: "TASKS_MANAGEMENT", pipeValue: 50000, quotationValue: null },
      { status: "WON", category: "TASKS_MANAGEMENT", pipeValue: 50000, quotationValue: 120000 },
    ]);

    expect(metrics.pipeCount).toBe(1);
    expect(metrics.wonCount).toBe(1);
    expect(metrics.invoiceCount).toBe(0);
    expect(metrics.byCategory[0]?.count).toBe(2);
  });

  it("aggregates invoice count and value", () => {
    const metrics = computePipeMetrics([
      { status: "INVOICE", category: "TASKS_MANAGEMENT", pipeValue: null, quotationValue: 45000 },
      { status: "PROPOSAL", category: "TASKS_MANAGEMENT", pipeValue: null, quotationValue: 20000 },
    ]);

    expect(metrics.invoiceCount).toBe(1);
    expect(metrics.invoiceValue).toBe(45000);
    expect(metrics.pipeCount).toBe(2);
  });
});
