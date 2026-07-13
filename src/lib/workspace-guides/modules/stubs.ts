import type { WorkspaceGuide } from "../types";

/** Stub — expand with snapshots in a later pass. */
export const IMS_GUIDE: WorkspaceGuide = {
  id: "ims",
  title: "IMS — Inventory",
  summary:
    "Stock in/out, balances, and reorder exceptions that feed the same EM scoreboard.",
  pathPrefixes: ["/app/ims"],
  keywords: ["ims", "inventory", "stock", "reorder", "warehouse"],
  primaryHref: "/app/ims",
  snapshots: [],
  steps: [
    {
      id: "open",
      title: "Open Inventory",
      body: "Go to IMS from the sidebar. Review balances and reorder exceptions first — those surface on Home and EM.",
    },
    {
      id: "move",
      title: "Record stock moves",
      body: "Use stock in/out and purchase-order flows as configured for your org. Attachments and vendors live under the same IMS module.",
    },
  ],
  tips: ["Snapshot walkthrough coming soon — ask for reorder exceptions meanwhile."],
};

export const CHECKLISTS_GUIDE: WorkspaceGuide = {
  id: "checklists",
  title: "Checklists / PC",
  summary:
    "Recurring process checklists (PC) with completion proof — rolls into person-wise EM deficit.",
  pathPrefixes: ["/app/checklists"],
  keywords: ["checklist", "pc", "process checklist", "sop"],
  primaryHref: "/app/checklists",
  snapshots: [],
  steps: [
    {
      id: "run",
      title: "Run today’s checklist",
      body: "Open Checklists, pick the template, complete items with proof where required.",
    },
  ],
};

export const LEADS_GUIDE: WorkspaceGuide = {
  id: "leads",
  title: "Leads / CRM",
  summary:
    "Lead capture and follow-up often runs as an FMS fulfillment flow plus CRM views.",
  pathPrefixes: ["/app/leads", "/app/crm"],
  keywords: ["leads", "crm", "lead", "follow-up", "sales"],
  primaryHref: "/app/fms/fulfillment?flow=leads",
  snapshots: [],
  steps: [
    {
      id: "open",
      title: "Open leads flow",
      body: "Use FMS fulfillment → Leads (or CRM if enabled) to capture and advance lead stages with SLA.",
    },
  ],
};
