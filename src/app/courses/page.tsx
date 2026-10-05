import type { Metadata } from "next";
import { CoursesPageContent } from "@/components/marketing/courses-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Two live programs | Business Owners and Working Professionals",
  description:
    "Business Owners: ₹1,10,000, 30 classes × 2 hours, one live flow on your data. Working Professionals: ₹25,000, 20 classes × 1.5 hours, FMS, IMS, person-wise deficit, and checklist. Pay half on this page. GST extra.",
  path: "/courses",
});

export default function CoursesPage() {
  return <CoursesPageContent />;
}
