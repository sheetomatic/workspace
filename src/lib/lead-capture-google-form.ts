import { WorkspaceLinkType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatWhatsAppPhone } from "@/lib/phone";

export const DEFAULT_LEAD_CAPTURE_GOOGLE_FORM_URL =
  process.env.DEFAULT_LEAD_CAPTURE_GOOGLE_FORM_URL?.trim() ||
  "https://forms.gle/KWSDZty3x4vkgbwX6";

/** Per-org Google Form link (not the platform default). */
export async function getOrgLeadCaptureFormUrl(organizationId: string) {
  const link = await prisma.workspaceLink.findFirst({
    where: { organizationId, type: WorkspaceLinkType.GOOGLE_FORM },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { url: true },
  });
  return link?.url?.trim() || null;
}

/** Primary org may use platform default; all others need their own form. */
export async function isLeadCaptureFormConfigured(organizationId: string) {
  const orgForm = await getOrgLeadCaptureFormUrl(organizationId);
  if (orgForm) {
    return true;
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { isPrimary: true },
  });

  return Boolean(org?.isPrimary && DEFAULT_LEAD_CAPTURE_GOOGLE_FORM_URL);
}

export async function getLeadCaptureGoogleFormUrl(organizationId: string) {
  const configured = await getOrgLeadCaptureFormUrl(organizationId);
  if (configured) {
    return configured;
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { isPrimary: true },
  });
  if (org?.isPrimary && DEFAULT_LEAD_CAPTURE_GOOGLE_FORM_URL) {
    return DEFAULT_LEAD_CAPTURE_GOOGLE_FORM_URL;
  }

  return null;
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
    "Please share your details using this quick form - responses go straight to our team sheet:",
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
