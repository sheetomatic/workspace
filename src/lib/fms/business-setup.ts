/**
 * Business-type driven FMS setup. The user picks business type + industry,
 * and each business process is provisioned as its own FMS (Leads FMS, PO FMS, …)
 * using the matching workflow preset from workflow-templates.ts.
 */

export type BusinessProcessOption = {
  presetId: string;
  label: string;
  processArea: string;
  recommended: boolean;
};

export type BusinessTypeProfile = {
  id: string;
  label: string;
  description: string;
  exampleIndustries: string[];
  processes: BusinessProcessOption[];
};

export const BUSINESS_TYPE_PROFILES: BusinessTypeProfile[] = [
  {
    id: "manufacturing",
    label: "Manufacturing",
    description:
      "Make-to-order or make-to-stock production — inquiry to production, stores, and dispatch.",
    exampleIndustries: [
      "PEB steel buildings",
      "Auto components",
      "FMCG",
      "Furniture",
      "Textiles",
      "Machinery",
    ],
    processes: [
      { presetId: "inquiry-to-quotation", label: "Inquiry to Quotation", processArea: "Leads", recommended: true },
      { presetId: "sales-order", label: "Sales Order", processArea: "Sales orders", recommended: true },
      { presetId: "order-to-production", label: "Order to Production", processArea: "Production", recommended: true },
      { presetId: "stock-issue", label: "Stock Issue", processArea: "Inventory", recommended: true },
      { presetId: "purchase-order", label: "Purchase Order", processArea: "Purchase", recommended: true },
      { presetId: "packing-to-dispatch", label: "Packing to Dispatch", processArea: "Dispatch", recommended: true },
      { presetId: "payment-collection", label: "Payment Collection", processArea: "Accounts", recommended: true },
      { presetId: "vendor-onboarding", label: "Vendor Onboarding", processArea: "Purchase", recommended: false },
      { presetId: "complaint-ticket", label: "Complaint Ticket", processArea: "Support", recommended: false },
      { presetId: "task-delegation", label: "Task Delegation", processArea: "MIS", recommended: false },
      { presetId: "recruitment", label: "Recruitment", processArea: "HR", recommended: false },
    ],
  },
  {
    id: "trading",
    label: "Trading / Distribution",
    description:
      "Buy and sell finished goods — leads, sales orders, stock check, purchase, and delivery.",
    exampleIndustries: [
      "Building materials",
      "Electronics distribution",
      "Pharma distribution",
      "Industrial supplies",
      "Food & grocery",
    ],
    processes: [
      { presetId: "sales-lead-to-closure", label: "Lead to Closure", processArea: "Leads", recommended: true },
      { presetId: "sales-order", label: "Sales Order", processArea: "Sales orders", recommended: true },
      { presetId: "stock-check-fulfillment", label: "Stock Check Fulfillment", processArea: "Inventory", recommended: true },
      { presetId: "purchase-order", label: "Purchase Order", processArea: "Purchase", recommended: true },
      { presetId: "dispatch-to-delivery", label: "Dispatch to Delivery", processArea: "Dispatch", recommended: true },
      { presetId: "payment-collection", label: "Payment Collection", processArea: "Accounts", recommended: true },
      { presetId: "vendor-onboarding", label: "Vendor Onboarding", processArea: "Purchase", recommended: false },
      { presetId: "invoice-creation", label: "Invoice Creation", processArea: "Accounts", recommended: false },
      { presetId: "complaint-ticket", label: "Complaint Ticket", processArea: "Support", recommended: false },
      { presetId: "recruitment", label: "Recruitment", processArea: "HR", recommended: false },
    ],
  },
  {
    id: "services",
    label: "Services",
    description:
      "Consulting, agencies, and service delivery — leads, quotations, delegation, and billing.",
    exampleIndustries: [
      "IT services",
      "Marketing agency",
      "CA / legal firm",
      "Facility management",
      "Training institute",
    ],
    processes: [
      { presetId: "sales-lead-to-closure", label: "Lead to Closure", processArea: "Leads", recommended: true },
      { presetId: "inquiry-to-quotation", label: "Inquiry to Quotation", processArea: "Leads", recommended: true },
      { presetId: "task-delegation", label: "Task Delegation", processArea: "Delivery", recommended: true },
      { presetId: "invoice-creation", label: "Invoice Creation", processArea: "Accounts", recommended: true },
      { presetId: "payment-collection", label: "Payment Collection", processArea: "Accounts", recommended: true },
      { presetId: "complaint-ticket", label: "Complaint Ticket", processArea: "Support", recommended: true },
      { presetId: "it-helpdesk", label: "IT Helpdesk", processArea: "IT", recommended: false },
      { presetId: "expense-approval", label: "Expense Approval", processArea: "Accounts", recommended: false },
      { presetId: "recruitment", label: "Recruitment", processArea: "HR", recommended: false },
    ],
  },
  {
    id: "projects",
    label: "Projects / EPC",
    description:
      "Project-based execution — PEB erection, contracting, interiors, and site delivery.",
    exampleIndustries: [
      "PEB erection",
      "Civil contracting",
      "Interior fit-outs",
      "Solar EPC",
      "HVAC projects",
    ],
    processes: [
      { presetId: "inquiry-to-quotation", label: "Inquiry to Quotation", processArea: "Leads", recommended: true },
      { presetId: "sales-order", label: "Sales Order", processArea: "Sales orders", recommended: true },
      { presetId: "order-to-production", label: "Order to Production", processArea: "Execution", recommended: true },
      { presetId: "purchase-order", label: "Purchase Order", processArea: "Purchase", recommended: true },
      { presetId: "dispatch-to-delivery", label: "Dispatch to Delivery", processArea: "Dispatch", recommended: true },
      { presetId: "task-delegation", label: "Task Delegation", processArea: "Execution", recommended: true },
      { presetId: "payment-collection", label: "Payment Collection", processArea: "Accounts", recommended: true },
      { presetId: "expense-approval", label: "Expense Approval", processArea: "Accounts", recommended: false },
      { presetId: "vendor-onboarding", label: "Vendor Onboarding", processArea: "Purchase", recommended: false },
      { presetId: "recruitment", label: "Recruitment", processArea: "HR", recommended: false },
    ],
  },
];

export function getBusinessTypeProfile(id: string) {
  return BUSINESS_TYPE_PROFILES.find((profile) => profile.id === id) ?? null;
}
