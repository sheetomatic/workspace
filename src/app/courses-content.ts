import { buildWhatsAppUrl } from "./site-content";
import { coursePrograms, type CoursePhase } from "@/lib/content/course-programs";

export const coursesPage = {
  eyebrow: "Live 1:1 with Shyam",
  title: "Two programs. Your business, or your skill.",
  lead:
    "Business owners leave with one live flow on their own data. Working professionals leave able to build an FMS, an IMS, a person-wise deficit, and a checklist — and to check AI before it touches a live file.",
  ctaLabel: "Enroll & pay",
  ctaSecondaryLabel: "Open Workspace",
  ctaQuestionsLabel: "Questions on WhatsApp",
  whatsappMessage:
    "Hi Sheetomatic, I have a question about the Business Owners course (₹1,10,000) or the Working Professionals course (₹25,000).",
  videosLead:
    "Free Sheetomatic videos on Sheets, AppSheet, and the weekly view. The paid programs turn that into your file, or into a skill you can repeat.",
  libraryTitle: "Learn from the channel",
  libraryLead:
    "Browse the free library. The paid seat is the live work with Shyam.",
  funnelTitle: "Pick a program, pay half, then book the slots",
  funnelLead:
    "50% confirms the seat. GST is extra. The balance is due before class 1. Monday + Friday, or Tuesday + Saturday.",
  instructorNote: "Instructor: Shyam Kumar Banjare",
} as const;

export const coursesWhatsAppUrl = buildWhatsAppUrl(coursesPage.whatsappMessage);

/** @deprecated Page renders coursePrograms. Kept so older imports still compile. */
export const coursePhases: CoursePhase[] = coursePrograms.flatMap(
  (program) => program.phases,
);

export const courseFormatBullets = [
  "Business Owners — ₹1,10,000 · 30 classes × 2 hours · 8:30–10:30 AM IST",
  "Working Professionals — ₹25,000 · 20 classes × 1.5 hours · 8:30–10:00 AM IST",
  "Monday + Friday, or Tuesday + Saturday",
  "50% on Razorpay to confirm the seat. Balance before class 1. GST extra.",
] as const;
