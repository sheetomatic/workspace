export const REQUISITION_STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CLOSED: "Closed",
} as const;

export type RequisitionStatusLabel = keyof typeof REQUISITION_STATUS_LABELS;
