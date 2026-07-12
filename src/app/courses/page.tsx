import type { Metadata } from "next";
import { CoursesPageContent } from "@/components/marketing/courses-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "1:1 Coaching | Google Sheets, AppSheet & Looker Studio",
  description:
    "Live 1:1 coaching on Google Sheets, AppSheet, and Looker Studio — use cases based on your business. 24 classes × 1.5 hours. Weekly Mon+Fri or Tue+Sat, 8:30–10:00 AM IST. ₹35,000 — pay on this page.",
  path: "/courses",
});

export default function CoursesPage() {
  return <CoursesPageContent />;
}
