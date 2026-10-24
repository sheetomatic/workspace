import { buildWhatsAppUrl } from "./site-content";
import { coursePrograms, type CoursePhase } from "@/lib/content/course-programs";

export const coursesPage = {
  eyebrow: "Live 1:1 with Shyam · Recorded courses",
  title: "Learn at your pace. Build with a mentor.",
  lead:
    "Choose live 1:1 training for Working Professionals or Business Owners, or start with a recorded course. Build practical skills in Google Sheets, AppSheet, and business automation.",
  ctaLabel: "Enroll & pay",
  ctaSecondaryLabel: "Open Workspace",
  ctaQuestionsLabel: "Questions on WhatsApp",
  whatsappMessage:
    "Hi Sheetomatic, I have a question about the Business Owners course (₹1,10,000) or the Working Professionals course (₹25,000).",
  videosLead:
    "Watch selected Google Sheets, AppSheet, and dashboard lessons from the Sheetomatic channel before choosing a recorded course or live 1:1 program.",
  libraryTitle: "Learn from the channel",
  libraryLead:
    "Practical walkthroughs for formulas, dashboards, automation, and business systems.",
  funnelTitle: "Owners book a meeting first. Professionals can enroll now.",
  funnelLead:
    "Business Owners: see the system, book a requirement slot, and enroll once you are sure. Working Professionals: pay half to confirm the seat. GST is extra. Balance before class 1.",
  instructorNote: "Instructor: Shyam Kumar Banjare",
} as const;

export const coursesWhatsAppUrl = buildWhatsAppUrl(coursesPage.whatsappMessage);

/** @deprecated Page renders coursePrograms. Kept so older imports still compile. */
export const coursePhases: CoursePhase[] = coursePrograms.flatMap(
  (program) => program.phases,
);

export const courseFormatBullets = [
  "Business Owners — ready system for Sales, Operations, Inventory, and Dispatch. Book a requirement meeting, then enroll. ₹1,10,000 · 30 classes × 2 hours.",
  "Working Professionals — ₹25,000 · 20 classes × 1.5 hours · 8:30–10:00 AM IST",
  "Monday + Friday, or Tuesday + Saturday",
  "50% on Razorpay to confirm the seat. Balance before class 1. GST extra.",
] as const;
