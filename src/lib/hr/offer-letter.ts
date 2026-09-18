import { randomBytes } from "node:crypto";
import type { EmploymentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";
import { sendPlainEmail } from "@/lib/integrations/email";
import { buildWhatsAppMeUrl } from "@/lib/hr/docs-link";
import { offerStatusLabel } from "@/lib/hr/offer-letter-labels";

export { offerStatusLabel };

export function createOfferShareToken() {
  return randomBytes(24).toString("base64url");
}

export function buildOfferPublicUrl(token: string) {
  return `${getLoginBaseUrl()}/hr/offer/${encodeURIComponent(token)}`;
}

function moneyInr(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateIn(date: Date | null | undefined) {
  if (!date) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type OfferLetterDraftInput = {
  organizationName: string;
  candidateName: string;
  roleTitle: string;
  department?: string | null;
  employmentType: EmploymentType;
  ctcAnnual?: number | null;
  ctcMonthly?: number | null;
  joiningDate?: Date | null;
  probationMonths: number;
  offerValidUntil?: Date | null;
  workLocation?: string | null;
  reportingTo?: string | null;
  benefitsNotes?: string | null;
};

const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
};

/**
 * Standard Indian SME offer letter body (HTML snapshot frozen at create/send).
 */
export function renderOfferLetterHtml(input: OfferLetterDraftInput): string {
  const org = escapeHtml(input.organizationName);
  const name = escapeHtml(input.candidateName);
  const role = escapeHtml(input.roleTitle);
  const department = input.department?.trim()
    ? escapeHtml(input.department.trim())
    : null;
  const location = input.workLocation?.trim()
    ? escapeHtml(input.workLocation.trim())
    : null;
  const reporting = input.reportingTo?.trim()
    ? escapeHtml(input.reportingTo.trim())
    : null;
  const benefits = input.benefitsNotes?.trim()
    ? escapeHtml(input.benefitsNotes.trim())
    : null;
  const annual = moneyInr(input.ctcAnnual ?? null);
  const monthly = moneyInr(input.ctcMonthly ?? null);
  const compensation =
    annual && monthly
      ? `${annual} per annum (approx. ${monthly} per month)`
      : annual
        ? `${annual} per annum`
        : monthly
          ? `${monthly} per month`
          : "As discussed and mutually agreed";

  return `
<p>Dear <strong>${name}</strong>,</p>
<p>
  We are pleased to offer you employment with <strong>${org}</strong> for the position of
  <strong>${role}</strong>${department ? ` in the <strong>${department}</strong> department` : ""}.
</p>
<p>This offer is subject to the following terms:</p>
<ol>
  <li><strong>Position:</strong> ${role} (${EMPLOYMENT_LABEL[input.employmentType]})</li>
  <li><strong>Compensation:</strong> ${escapeHtml(compensation)} (CTC), subject to statutory deductions.</li>
  <li><strong>Date of joining:</strong> ${formatDateIn(input.joiningDate ?? null)}</li>
  <li><strong>Probation:</strong> ${input.probationMonths} month(s) from the date of joining. Confirmation of employment will follow successful completion of probation.</li>
  ${location ? `<li><strong>Work location:</strong> ${location}</li>` : ""}
  ${reporting ? `<li><strong>Reporting to:</strong> ${reporting}</li>` : ""}
  ${benefits ? `<li><strong>Other benefits / notes:</strong> ${benefits}</li>` : ""}
  <li><strong>Offer validity:</strong> Please accept this offer on or before ${formatDateIn(input.offerValidUntil ?? null)}. After this date the offer may lapse unless extended in writing.</li>
</ol>
<p>
  This offer is contingent upon satisfactory background verification, submission of joining documents,
  and your acceptance of company policies shared at the time of joining. An appointment letter will be
  issued on or after your joining date.
</p>
<p>
  To accept or decline this offer, use the secure link shared with you. On acceptance, our HR team will
  share next steps for onboarding.
</p>
<p>We look forward to welcoming you to ${org}.</p>
<p>
  Warm regards,<br />
  <strong>Human Resources</strong><br />
  ${org}
</p>
`.trim();
}

export async function listOfferLetters(organizationId: string) {
  return prisma.offerLetter.findMany({
    where: { organizationId },
    include: {
      candidate: {
        select: { id: true, fullName: true, email: true, phone: true, stage: true },
      },
      jobOpening: { select: { id: true, title: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getOfferLetterForOrg(organizationId: string, offerId: string) {
  return prisma.offerLetter.findFirst({
    where: { id: offerId, organizationId },
    include: {
      candidate: true,
      jobOpening: { select: { title: true } },
      organization: { select: { name: true, logoUrl: true } },
    },
  });
}

export async function getOfferLetterByToken(token: string) {
  const offer = await prisma.offerLetter.findFirst({
    where: { shareToken: token },
    include: {
      candidate: { select: { fullName: true, email: true, phone: true } },
      organization: { select: { name: true, logoUrl: true } },
      jobOpening: { select: { title: true } },
    },
  });
  if (!offer) return null;

  if (
    offer.status === "SENT" &&
    offer.offerValidUntil &&
    offer.offerValidUntil.getTime() < Date.now()
  ) {
    await prisma.offerLetter.update({
      where: { id: offer.id },
      data: { status: "EXPIRED" },
    });
    return { ...offer, status: "EXPIRED" as const };
  }

  return offer;
}

export function offerEmailCopy(params: {
  candidateName: string;
  organizationName: string;
  roleTitle: string;
  url: string;
  validUntil: Date | null;
}) {
  const subject = `Offer of employment — ${params.roleTitle} at ${params.organizationName}`;
  const text = [
    `Dear ${params.candidateName},`,
    ``,
    `Congratulations. ${params.organizationName} is pleased to offer you the position of ${params.roleTitle}.`,
    ``,
    `Please review the full offer letter and accept or decline using this secure link:`,
    params.url,
    ``,
    params.validUntil
      ? `This offer is valid until ${formatDateIn(params.validUntil)}.`
      : `Please respond at your earliest convenience.`,
    ``,
    `If the link does not open, copy and paste it into your browser.`,
    ``,
    `— Human Resources`,
    params.organizationName,
  ].join("\n");
  return { subject, text };
}

export async function sendOfferLetterEmail(params: {
  toEmail: string;
  candidateName: string;
  organizationName: string;
  roleTitle: string;
  url: string;
  validUntil: Date | null;
}) {
  const { subject, text } = offerEmailCopy(params);
  return sendPlainEmail({ toEmail: params.toEmail, subject, text });
}

export function offerWhatsAppHref(params: {
  phone: string | null | undefined;
  candidateName: string;
  organizationName: string;
  roleTitle: string;
  url: string;
}) {
  const text = [
    `Hi ${params.candidateName},`,
    ``,
    `${params.organizationName} has shared an offer for *${params.roleTitle}*.`,
    ``,
    `Review and respond here:`,
    params.url,
  ].join("\n");
  return buildWhatsAppMeUrl(params.phone ?? "", text);
}
