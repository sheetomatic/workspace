import { describe, expect, it } from "vitest";
import { categorizeLeadRequirement, leadCategoryLabel } from "@/lib/leads/categories";
import { computePipeMetrics } from "@/lib/leads/pipe-metrics";

describe("categorizeLeadRequirement", () => {
  it("classifies CRM automation requirements", () => {
    expect(categorizeLeadRequirement("CRM whatsapp automation with google sheet")).toBe(
      "CRM_AUTOMATION",
    );
  });

  it("classifies chatbot requirements", () => {
    expect(categorizeLeadRequirement("Chatboat set up for Customer")).toBe("CHATBOT_AI");
  });

  it("returns readable labels", () => {
    expect(leadCategoryLabel("FMS_ERP")).toBe("FMS & ERP");
  });
});

describe("computePipeMetrics", () => {
  it("aggregates pipe and won values", () => {
    const metrics = computePipeMetrics([
      { status: "NEW", category: "CRM_AUTOMATION", pipeValue: 85000, quotationValue: null },
      { status: "WON", category: "CRM_AUTOMATION", pipeValue: 85000, quotationValue: 120000 },
    ]);

    expect(metrics.pipeCount).toBe(1);
    expect(metrics.wonCount).toBe(1);
    expect(metrics.byCategory[0]?.count).toBe(2);
  });
});
