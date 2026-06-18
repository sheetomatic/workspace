export type FmsDepartmentId =
  | "sales"
  | "purchase"
  | "production"
  | "inventory"
  | "dispatch"
  | "accounts"
  | "hr"
  | "support"
  | "quality"
  | "mis"
  | "it";

export const FMS_DEPARTMENTS: Array<{ id: FmsDepartmentId; label: string }> = [
  { id: "sales", label: "Sales" },
  { id: "purchase", label: "Purchase" },
  { id: "production", label: "Production" },
  { id: "inventory", label: "Inventory" },
  { id: "dispatch", label: "Dispatch" },
  { id: "accounts", label: "Accounts" },
  { id: "hr", label: "HR" },
  { id: "support", label: "Support" },
  { id: "quality", label: "Quality" },
  { id: "mis", label: "MIS" },
  { id: "it", label: "IT" },
];

export type FmsAiStarter = {
  id: string;
  department: FmsDepartmentId;
  label: string;
  summary: string;
  prompt: string;
  templateId?: string;
};

export const FMS_AI_STARTERS: FmsAiStarter[] = [
  {
    id: "sales-lead",
    department: "sales",
    label: "Lead to Closure",
    summary: "Capture, follow-up, win or lose",
    templateId: "sales-lead-to-closure",
    prompt:
      "Sales FMS for Indian MSME: Lead Capture, Follow-up, and Closure stages. Fields: lead name, contact, source, requirement, assigned salesperson, follow-up date, lead stage, expected value, status, lost/won reason. Start: new lead. End: deal closed.",
  },
  {
    id: "sales-quotation",
    department: "sales",
    label: "Inquiry to Quotation",
    summary: "Inquiry, quote prep, approval",
    templateId: "inquiry-to-quotation",
    prompt:
      "Inquiry to Quotation FMS: Inquiry Form, Quotation Preparation, Quotation Approval. Customer, product/service, quantity, requirement, target date, quotation amount, prepared by, approved by. Start: customer inquiry. End: approved quotation sent.",
  },
  {
    id: "purchase-po",
    department: "purchase",
    label: "Purchase Order",
    summary: "Vendor, approval, pay, receive",
    templateId: "purchase-order",
    prompt:
      "Purchase Order FMS: vendor shortlist, founder approval, accounts payment, warehouse goods receipt. Include TAT per stage and distinct owners for ops, founder, accounts, warehouse.",
  },
  {
    id: "purchase-requisition",
    department: "purchase",
    label: "Purchase Requisition",
    summary: "Material request and approval",
    templateId: "purchase-requisition",
    prompt:
      "Purchase Requisition FMS: Material Request and Approval. Requested by, department, item, quantity, required date, purpose, priority, approval status. Start: internal material need. End: approved for PO.",
  },
  {
    id: "inventory-stock-issue",
    department: "inventory",
    label: "Stock Issue",
    summary: "Request, approve, issue materials",
    templateId: "stock-issue",
    prompt:
      "Stock Issue FMS: Material Issue Request and Issue Confirmation. Requested by, item, quantity, purpose, job number, approved by, issued quantity. Start: department requests stock. End: materials issued from store.",
  },
  {
    id: "production-order",
    department: "production",
    label: "Order to Production",
    summary: "Sales order to job assignment",
    templateId: "order-to-production",
    prompt:
      "Order to Production FMS: Production Order and Job Assignment. Sales order number, product, quantity, required date, production manager, priority, status. Start: confirmed sales order. End: job assigned on shop floor.",
  },
  {
    id: "dispatch-packing",
    department: "dispatch",
    label: "Packing to Dispatch",
    summary: "Pack, ship, track delivery",
    templateId: "packing-to-dispatch",
    prompt:
      "Packing to Dispatch FMS: Packing Completion and Dispatch. Order number, packed quantity, boxes, weight, dispatch date, transport mode, status. Start: order ready to pack. End: goods dispatched.",
  },
  {
    id: "accounts-invoice",
    department: "accounts",
    label: "Invoice Creation",
    summary: "Invoice request and confirmation",
    templateId: "invoice-creation",
    prompt:
      "Invoice Creation FMS: Invoice Request and Invoice Confirmation. Customer, order number, amount, GST details, billing address, invoice number, status. Start: delivery or milestone complete. End: invoice issued.",
  },
  {
    id: "hr-leave",
    department: "hr",
    label: "Leave Approval",
    summary: "Request, manager approve",
    templateId: "leave-approval",
    prompt:
      "Leave Approval FMS: Leave Request and Manager Approval. Employee, leave type, from date, to date, reason, reporting manager, approval status. Start: employee applies. End: leave approved or rejected.",
  },
  {
    id: "support-complaint",
    department: "support",
    label: "Complaint Ticket",
    summary: "Log complaint, resolve",
    templateId: "complaint-ticket",
    prompt:
      "Complaint Ticket FMS: Complaint Form and Resolution. Customer, complaint type, priority, product, issue description, assigned to, SLA, status. Start: customer complaint logged. End: issue resolved.",
  },
  {
    id: "mis-task-delegation",
    department: "mis",
    label: "Task Delegation",
    summary: "Assign, update, proof",
    templateId: "task-delegation",
    prompt:
      "Task Delegation FMS: Task Assignment and Task Update with proof. Task, assigned to, priority, due date, status, delay reason, completion proof. Start: manager assigns task. End: task verified complete.",
  },
  {
    id: "it-helpdesk",
    department: "it",
    label: "IT Helpdesk",
    summary: "Ticket and resolution",
    templateId: "it-helpdesk",
    prompt:
      "IT Helpdesk FMS: IT Ticket and Resolution. Employee, issue type, priority, device/system, assigned IT person, resolution status. Start: employee raises ticket. End: issue fixed.",
  },
];

export function getFmsAiStarter(id: string) {
  return FMS_AI_STARTERS.find((starter) => starter.id === id) ?? null;
}
