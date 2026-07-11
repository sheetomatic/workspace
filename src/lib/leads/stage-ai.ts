import type { InboundLeadStatus } from "@prisma/client";
import { categorizeLeadRequirement } from "@/lib/leads/categories";

/** Rule-based next-stage suggestion from requirement text (matches Sheetomatic sales flow). */
export function inferLeadStageFromRequirement(
  requirement: string | null | undefined,
): InboundLeadStatus {
  const text = (requirement ?? "").toLowerCase();
  if (!text.trim()) {
    return "NEW";
  }

  if (
    /not interested|no budget|already have|declined|reject/i.test(text)
  ) {
    return "LOST";
  }

  if (/paid|payment received|advance paid|full payment|invoice paid/i.test(text)) {
    return "PAYMENT";
  }

  if (/\btax invoice\b|invoice sent|send invoice/i.test(text)) {
    return "INVOICE";
  }

  if (/quotation|proposal|quote|pricing|estimate/i.test(text)) {
    return "PROPOSAL";
  }

  if (/meeting done|met client|demo done|presentation/i.test(text)) {
    return "MEETING_NOTES";
  }

  if (/demo scheduled|book demo|product demo/i.test(text)) {
    return "DEMO_SCHEDULED";
  }

  if (/negotiat|discount|counter offer|revise quote/i.test(text)) {
    return "NEGOTIATION";
  }

  if (/schedule meeting|book meeting|call scheduled|demo call/i.test(text)) {
    return "SCHEDULE_MEETING";
  }

  if (/follow up|follow-up|callback|call back|remind/i.test(text)) {
    return "FOLLOW_UP";
  }

  if (/project start|development|implementation|go live|deploy/i.test(text)) {
    return "PROJECT_ACTIVE";
  }

  if (/won|closed|signed|confirmed order/i.test(text)) {
    return "WON";
  }

  const category = categorizeLeadRequirement(requirement);
  if (category === "GENERAL") {
    return "NEW";
  }

  return "SCHEDULE_MEETING";
}

export function mapSheetStageToStatus(value: string): InboundLeadStatus | undefined {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, " ");
  const map: Record<string, InboundLeadStatus> = {
    new: "NEW",
    "schedule meeting": "SCHEDULE_MEETING",
    "meeting notes": "MEETING_NOTES",
    "meeting done": "MEETING_NOTES",
    contacted: "CONTACTED",
    "follow up": "FOLLOW_UP",
    followup: "FOLLOW_UP",
    qualified: "QUALIFIED",
    demo: "DEMO_SCHEDULED",
    "demo scheduled": "DEMO_SCHEDULED",
    "discovery scheduled": "DEMO_SCHEDULED",
    "make proposal | invoice": "PROPOSAL",
    "make proposal": "PROPOSAL",
    proposal: "PROPOSAL",
    negotiation: "NEGOTIATION",
    negotiating: "NEGOTIATION",
    invoice: "INVOICE",
    "tax invoice": "INVOICE",
    payment: "PAYMENT",
    "project active": "PROJECT_ACTIVE",
    won: "WON",
    "closed won": "WON",
    lost: "LOST",
    "closed lost": "LOST",
    "no answer": "FOLLOW_UP",
    calling: "CONTACTED",
  };

  return map[normalized];
}
