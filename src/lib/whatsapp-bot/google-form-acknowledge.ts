import { findFormResponseForPhone } from "@/lib/integrations/google-form-responses-sheet";
import { isGoogleSheetsAuthConfigured } from "@/lib/integrations/google-sheets-auth";
import { prisma } from "@/lib/db";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import {
  safeCustomerDisplayName,
  safeCustomerFirstName,
} from "@/lib/wa-safe-customer-name";
import { updateWaContactFromFormResponse } from "@/lib/wa-inbox-store";

export function googleFormAcknowledgmentText(
  name: string | null | undefined,
  organizationName: string,
) {
  const firstName = safeCustomerFirstName(name);
  const thanks = firstName
    ? `Thank you, ${firstName}! We've received your details.`
    : `Thank you! We've received your details.`;
  return [
    thanks,
    "",
    `Our team at *${organizationName}* will review your request and get back to you soon.`,
    "",
    "Feel free to ask any questions here - pricing, product demos, or how we can help.",
    "",
    "Reply *menu* to browse FAQs and videos.",
  ].join("\n");
}

export async function maybeAcknowledgeGoogleFormSubmission(params: {
  organizationId: string;
  organizationName: string;
  fromPhone: string;
  contactId: string;
  sendReply: (text: string) => Promise<void>;
}): Promise<boolean> {
  if (!isGoogleSheetsAuthConfigured()) {
    return false;
  }

  const phone = normalizeWhatsAppPhone(params.fromPhone);
  if (!phone) {
    return false;
  }

  const contact = await prisma.waContact.findFirst({
    where: {
      id: params.contactId,
      organizationId: params.organizationId,
      phone,
    },
    select: {
      googleFormAckSentAt: true,
      leadCaptureComplete: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  if (!contact || contact.googleFormAckSentAt || !contact.leadCaptureComplete) {
    return false;
  }

  const response = await findFormResponseForPhone(phone, {
    since: contact.updatedAt ?? contact.createdAt,
  });
  if (!response?.name?.trim()) {
    return false;
  }

  const safeName = safeCustomerDisplayName(response.name);

  await params.sendReply(
    googleFormAcknowledgmentText(safeName, params.organizationName),
  );

  await updateWaContactFromFormResponse({
    contactId: params.contactId,
    organizationId: params.organizationId,
    data: {
      ...(safeName ? { name: safeName } : {}),
      email: response.email?.trim(),
      city: response.city?.trim(),
      requirementDescription: response.requirement?.trim(),
    },
  });

  return true;
}
