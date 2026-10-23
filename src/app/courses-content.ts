import { buildWhatsAppUrl } from "./site-content";
import { coursePrograms, type CoursePhase } from "@/lib/content/course-programs";

export const coursesPage = {
  eyebrow: "Practical learning · Real business systems",
  title: "Build real systems. Learn to run them.",
  lead:
    "Get a customised system built for your business, with training for your team. Or build your own skills through live 1:1 mentoring and recorded courses.",
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
    "Business Owners: discuss your organization chart, chosen technology, and system requirements before enrolling. Working Professionals: pay half to confirm your seat. GST is extra. Balance before class 1.",
  instructorNote: "Instructor: Shyam Kumar Banjare",
} as const;

export const coursesWhatsAppUrl = buildWhatsAppUrl(coursesPage.whatsappMessage);

/** @deprecated Page renders coursePrograms. Kept so older imports still compile. */
export const coursePhases: CoursePhase[] = coursePrograms.flatMap(
  (program) => program.phases,
);

export const courseFormatBullets = [
  "Business Owners — practical system development + team training within the agreed scope. ₹1,10,000 · 30 classes × 2 hours · 60 hours · about 15 weeks. Book a requirement meeting first.",
  "Working Professionals — ₹25,000 · 20 classes × 1.5 hours · 8:30–10:00 AM IST",
  "Monday + Friday, or Tuesday + Saturday",
  "50% on Razorpay to confirm the seat. Balance before class 1. GST extra.",
] as const;
