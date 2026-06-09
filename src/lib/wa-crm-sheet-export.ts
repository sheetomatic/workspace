import type { WaPipelineStage } from "@prisma/client";
import { formatWhatsAppPhone } from "@/lib/phone";
import { WA_PIPELINE_LABELS, parseContactTags } from "@/lib/wa-crm-shared";

export type WaCrmSheetExportContact = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  city: string | null;
  requirementDescription: string | null;
  intent: string | null;
  source: string;
  pipelineStage: WaPipelineStage;
  notes: string | null;
  tags: unknown;
  leadCaptureComplete: boolean;
  lastMessageAt: Date | null;
  nextFollowUpAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: { name: string | null; email: string } | null;
  lastMessagePreview: string | null;
};

export const WA_CRM_SHEET_HEADERS = [
  "Contact ID",
  "Name",
  "Phone",
  "Email",
  "City",
  "Requirement",
  "Intent",
  "Source",
  "Stage",
  "Assignee",
  "Assignee Email",
  "Last Message",
  "Last Message At",
  "Next Follow-up",
  "Tags",
  "Notes",
  "Lead Capture Complete",
  "Created At",
  "Updated At",
] as const;

function formatExportDate(date: Date | null | undefined) {
  if (!date) {
    return "";
  }
  return date.toISOString();
}

function assigneeLabel(contact: WaCrmSheetExportContact) {
  if (!contact.assignedTo) {
    return "";
  }
  return (
    contact.assignedTo.name?.trim() ||
    contact.assignedTo.email.split("@")[0] ||
    contact.assignedTo.email
  );
}

export function waCrmContactToSheetRow(contact: WaCrmSheetExportContact) {
  const tags = parseContactTags(contact.tags);

  return [
    contact.id,
    contact.name?.trim() || "",
    formatWhatsAppPhone(contact.phone),
    contact.email?.trim() || "",
    contact.city?.trim() || "",
    contact.requirementDescription?.trim() || "",
    contact.intent?.trim() || "",
    contact.source?.trim() || "whatsapp",
    WA_PIPELINE_LABELS[contact.pipelineStage],
    assigneeLabel(contact),
    contact.assignedTo?.email ?? "",
    contact.lastMessagePreview?.trim() || "",
    formatExportDate(contact.lastMessageAt),
    formatExportDate(contact.nextFollowUpAt),
    tags.join(", "),
    contact.notes?.trim() || "",
    contact.leadCaptureComplete ? "Yes" : "No",
    formatExportDate(contact.createdAt),
    formatExportDate(contact.updatedAt),
  ];
}

export function waCrmContactsToSheetRows(contacts: WaCrmSheetExportContact[]) {
  return [
    [...WA_CRM_SHEET_HEADERS],
    ...contacts.map((contact) => waCrmContactToSheetRow(contact)),
  ];
}
