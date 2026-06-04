import type {
  WhatsAppTemplateCategory,
  WhatsAppTemplateStatus,
} from "@prisma/client";
import type { WhatsAppTemplateVariable } from "@/lib/whatsapp-templates";

export type WhatsAppTemplateActionState = {
  ok: boolean;
  message: string;
  messageId?: string;
};

export const whatsAppTemplateInitialState: WhatsAppTemplateActionState = {
  ok: false,
  message: "",
};

export type WhatsAppTemplateRow = {
  id: string;
  name: string;
  category: WhatsAppTemplateCategory;
  language: string;
  body: string;
  variables: WhatsAppTemplateVariable[];
  status: WhatsAppTemplateStatus;
  rejectionReason: string | null;
  submittedAt: Date;
  approvedAt: Date | null;
  createdBy: { name: string | null; email: string };
};
