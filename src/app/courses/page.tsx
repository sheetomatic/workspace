import type { Metadata } from "next";
import { CoursesPageContent } from "@/components/marketing/courses-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Live 1:1 & Recorded Courses | Sheetomatic",
  description:
    "Live 1:1 programs for Working Professionals (₹25,000, 20 classes) and Business Owners (₹1,10,000, 30 classes), plus the recorded Google Sheets: Essentials to Pro course on Graphy.",
  path: "/courses",
});

export default function CoursesPage() {
  return <CoursesPageContent />;
}
