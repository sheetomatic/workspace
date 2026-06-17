import { newFlowchartStep, type FmsFlowchartStep } from "@/lib/fms/flow-design";

export type FmsWorkflowTemplate = {
  id: string;
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
    id: "purchase-order",
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
    id: "vendor-onboarding",
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
