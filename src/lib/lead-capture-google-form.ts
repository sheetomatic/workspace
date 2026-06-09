import { WorkspaceLinkType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatWhatsAppPhone } from "@/lib/phone";

export const DEFAULT_LEAD_CAPTURE_GOOGLE_FORM_URL =
  process.env.DEFAULT_LEAD_CAPTURE_GOOGLE_FORM_URL?.trim() ||
  "https://forms.gle/KWSDZty3x4vkgbwX6";

export async function getLeadCaptureGoogleFormUrl(organizationId: string) {
  const link = await prisma.workspaceLink.findFirst({
    where: { organizationId, type: WorkspaceLinkType.GOOGLE_FORM },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { url: true },
  });

  const configured = link?.url?.trim();
  if (configured) {
    return configured;
  }

  return DEFAULT_LEAD_CAPTURE_GOOGLE_FORM_URL || null;
}

export function leadCaptureGoogleFormWelcomeText(
  organizationName: string,
  phone: string,
  formUrl: string,
) {
  const formattedPhone = formatWhatsAppPhone(phone);
  return [
    `Hi! Welcome to *${organizationName}*.`,
    "",
    "Please share your details using this quick form — responses go straight to our team sheet:",
    "",
    formUrl,
    "",
    `Your WhatsApp number (${formattedPhone}) is already noted.`,
    "",
    "After submitting, reply here anytime with questions about pricing, products, or demos.",
    "",
    "Reply *menu* to browse FAQs and videos.",
  ].join("\n");
}

export function leadCaptureGoogleFormReminderText(formUrl: string) {
  return [
    "Please share your details using our form so we can assist you:",
    "",
    formUrl,
  ].join("\n");
}
