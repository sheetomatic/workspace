import type { Metadata } from "next";
import { CoursesPageContent } from "@/components/marketing/courses-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Two live programs | Business Owners and Working Professionals",
  description:
    "Business Owners: a ready system for Sales, Operations, Inventory, and Dispatch on Google Sheets, AppSheet, Apps Script, and Google Sites. Book a requirement meeting, then enroll. ₹1,10,000. Working Professionals: ₹25,000, 20 classes.",
  path: "/courses",
});

export default function CoursesPage() {
  return <CoursesPageContent />;
}
