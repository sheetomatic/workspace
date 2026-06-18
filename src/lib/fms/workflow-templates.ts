import { newFlowchartStep, type FmsFlowchartStep } from "@/lib/fms/flow-design";
import type { FmsDepartmentId } from "@/lib/fms/ai-starters";

export type FmsWorkflowTemplate = {
  id: string;
  department: FmsDepartmentId;
  name: string;
  description: string;
  steps: Array<{
    stepName: string;
    ownerRoleLabel: string;
    howInstructions: string;
    tatValue: string;
    tatUnit: "hours" | "days";
  }>;
};

export const FMS_WORKFLOW_TEMPLATES: FmsWorkflowTemplate[] = [
  {
    id: "sales-lead-to-closure",
    department: "sales",
    name: "Lead to Closure",
    description: "Lead capture, follow-up, and close won or lost.",
    steps: [
      {
        stepName: "Capture Lead",
        ownerRoleLabel: "Sales",
        howInstructions: "Record lead source, contact, requirement, and expected value.",
        tatValue: "4",
        tatUnit: "hours",
      },
      {
        stepName: "Follow-up",
        ownerRoleLabel: "Sales",
        howInstructions: "Call or message lead, update stage and next follow-up date.",
        tatValue: "2",
        tatUnit: "days",
      },
      {
        stepName: "Closure",
        ownerRoleLabel: "Sales Manager",
        howInstructions: "Mark won or lost with reason and final value.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "inquiry-to-quotation",
    department: "sales",
    name: "Inquiry to Quotation",
    description: "Customer inquiry through quote preparation and approval.",
    steps: [
      {
        stepName: "Log Inquiry",
        ownerRoleLabel: "Sales",
        howInstructions: "Capture customer, product, quantity, and target date.",
        tatValue: "4",
        tatUnit: "hours",
      },
      {
        stepName: "Prepare Quotation",
        ownerRoleLabel: "Sales Ops",
        howInstructions: "Build quotation amount and terms from inquiry details.",
        tatValue: "1",
        tatUnit: "days",
      },
      {
        stepName: "Approve Quotation",
        ownerRoleLabel: "Manager",
        howInstructions: "Review pricing and approve before sending to customer.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "purchase-order",
    department: "purchase",
    name: "Purchase Order",
    description: "Vendor shortlist, founder approval, payment, and goods receipt.",
    steps: [
      {
        stepName: "Source Vendor Shortlist",
        ownerRoleLabel: "Operations",
        howInstructions: "Collect vendor quotes and shortlist best options.",
        tatValue: "2",
        tatUnit: "days",
      },
      {
        stepName: "Founder Approval",
        ownerRoleLabel: "Founder",
        howInstructions: "Review vendor, quantity, and cost. Approve or reject.",
        tatValue: "1",
        tatUnit: "days",
      },
      {
        stepName: "Process Payment",
        ownerRoleLabel: "Accounts",
        howInstructions: "Release payment to approved vendor.",
        tatValue: "2",
        tatUnit: "days",
      },
      {
        stepName: "Receive Goods",
        ownerRoleLabel: "Warehouse",
        howInstructions: "Verify delivery against PO and update inventory.",
        tatValue: "3",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "purchase-requisition",
    department: "purchase",
    name: "Purchase Requisition",
    description: "Internal material request and department approval.",
    steps: [
      {
        stepName: "Material Request",
        ownerRoleLabel: "Requester",
        howInstructions: "Submit item, quantity, required date, and purpose.",
        tatValue: "4",
        tatUnit: "hours",
      },
      {
        stepName: "Department Approval",
        ownerRoleLabel: "Manager",
        howInstructions: "Approve priority and budget for the request.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "vendor-onboarding",
    department: "purchase",
    name: "Vendor Onboarding",
    description: "KYC, compliance check, and vendor master setup.",
    steps: [
      {
        stepName: "Collect KYC Documents",
        ownerRoleLabel: "Operations",
        howInstructions: "Gather GST, PAN, and bank details from vendor.",
        tatValue: "3",
        tatUnit: "days",
      },
      {
        stepName: "Compliance Review",
        ownerRoleLabel: "Admin",
        howInstructions: "Verify documents and approve vendor category.",
        tatValue: "2",
        tatUnit: "days",
      },
      {
        stepName: "Create Vendor Master",
        ownerRoleLabel: "Accounts",
        howInstructions: "Add vendor to accounting system and share vendor code.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "expense-approval",
    department: "accounts",
    name: "Expense Approval",
    description: "Submit, manager approve, accounts pay.",
    steps: [
      {
        stepName: "Submit Expense",
        ownerRoleLabel: "Staff",
        howInstructions: "Enter amount, category, and attach bill.",
        tatValue: "4",
        tatUnit: "hours",
      },
      {
        stepName: "Manager Approval",
        ownerRoleLabel: "Manager",
        howInstructions: "Review expense and approve or send back.",
        tatValue: "1",
        tatUnit: "days",
      },
      {
        stepName: "Accounts Payment",
        ownerRoleLabel: "Accounts",
        howInstructions: "Process reimbursement or vendor payment.",
        tatValue: "2",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "invoice-creation",
    department: "accounts",
    name: "Invoice Creation",
    description: "Invoice request, GST check, and invoice confirmation.",
    steps: [
      {
        stepName: "Invoice Request",
        ownerRoleLabel: "Sales",
        howInstructions: "Submit customer, order, amount, and billing details.",
        tatValue: "4",
        tatUnit: "hours",
      },
      {
        stepName: "Invoice Confirmation",
        ownerRoleLabel: "Accounts",
        howInstructions: "Generate invoice number and share with customer.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "stock-issue",
    department: "inventory",
    name: "Stock Issue",
    description: "Material request, approval, and issue from store.",
    steps: [
      {
        stepName: "Issue Request",
        ownerRoleLabel: "Department",
        howInstructions: "Request item, quantity, purpose, and job reference.",
        tatValue: "4",
        tatUnit: "hours",
      },
      {
        stepName: "Store Approval",
        ownerRoleLabel: "Store",
        howInstructions: "Verify stock and approve issue quantity.",
        tatValue: "1",
        tatUnit: "days",
      },
      {
        stepName: "Issue Materials",
        ownerRoleLabel: "Store",
        howInstructions: "Hand over materials and update stock ledger.",
        tatValue: "4",
        tatUnit: "hours",
      },
    ],
  },
  {
    id: "order-to-production",
    department: "production",
    name: "Order to Production",
    description: "Convert sales order into production job assignment.",
    steps: [
      {
        stepName: "Production Order",
        ownerRoleLabel: "Planning",
        howInstructions: "Confirm product, quantity, and required date from sales order.",
        tatValue: "1",
        tatUnit: "days",
      },
      {
        stepName: "Job Assignment",
        ownerRoleLabel: "Production Manager",
        howInstructions: "Assign machine, batch, and shift to fulfill order.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "packing-to-dispatch",
    department: "dispatch",
    name: "Packing to Dispatch",
    description: "Pack order and hand over to logistics.",
    steps: [
      {
        stepName: "Packing Complete",
        ownerRoleLabel: "Packing",
        howInstructions: "Confirm packed quantity, boxes, and weight.",
        tatValue: "4",
        tatUnit: "hours",
      },
      {
        stepName: "Dispatch",
        ownerRoleLabel: "Logistics",
        howInstructions: "Book transporter, share LR/AWB, and update dispatch date.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "leave-approval",
    department: "hr",
    name: "Leave Approval",
    description: "Employee leave request and manager approval.",
    steps: [
      {
        stepName: "Leave Request",
        ownerRoleLabel: "Employee",
        howInstructions: "Submit leave type, dates, and reason.",
        tatValue: "4",
        tatUnit: "hours",
      },
      {
        stepName: "Manager Approval",
        ownerRoleLabel: "Reporting Manager",
        howInstructions: "Approve or reject leave with remarks.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "complaint-ticket",
    department: "support",
    name: "Complaint Ticket",
    description: "Log customer complaint and close with resolution.",
    steps: [
      {
        stepName: "Log Complaint",
        ownerRoleLabel: "Support",
        howInstructions: "Capture customer, issue, priority, and SLA.",
        tatValue: "2",
        tatUnit: "hours",
      },
      {
        stepName: "Resolve Issue",
        ownerRoleLabel: "Support Lead",
        howInstructions: "Assign owner, fix issue, and confirm with customer.",
        tatValue: "2",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "task-delegation",
    department: "mis",
    name: "Task Delegation",
    description: "Assign task, track updates, and verify completion proof.",
    steps: [
      {
        stepName: "Assign Task",
        ownerRoleLabel: "Manager",
        howInstructions: "Set task, assignee, priority, and due date.",
        tatValue: "2",
        tatUnit: "hours",
      },
      {
        stepName: "Task Update",
        ownerRoleLabel: "Assignee",
        howInstructions: "Submit progress, proof, and completion or delay reason.",
        tatValue: "2",
        tatUnit: "days",
      },
      {
        stepName: "Verify Complete",
        ownerRoleLabel: "Manager",
        howInstructions: "Review proof and mark task complete or send back.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
  {
    id: "it-helpdesk",
    department: "it",
    name: "IT Helpdesk",
    description: "IT ticket logging and resolution.",
    steps: [
      {
        stepName: "Raise Ticket",
        ownerRoleLabel: "Employee",
        howInstructions: "Describe issue type, device, and priority.",
        tatValue: "2",
        tatUnit: "hours",
      },
      {
        stepName: "IT Resolution",
        ownerRoleLabel: "IT Support",
        howInstructions: "Diagnose, fix, and close ticket with notes.",
        tatValue: "1",
        tatUnit: "days",
      },
    ],
  },
];

export function getFmsWorkflowTemplate(id: string) {
  return FMS_WORKFLOW_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function templateToFlowchartSteps(template: FmsWorkflowTemplate): FmsFlowchartStep[] {
  return template.steps.map((step) => {
    const base = newFlowchartStep(step.stepName);
    return {
      ...base,
      ownerRoleLabel: step.ownerRoleLabel,
      howInstructions: step.howInstructions,
      tatValue: step.tatValue,
      tatUnit: step.tatUnit,
    };
  });
}
