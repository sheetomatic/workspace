import type { Metadata } from "next";
import { CoursesPageContent } from "@/components/marketing/courses-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Courses for MSME Owners | 24 × 1.5h Live 1:1 Systems Training",
  description:
    "Live 1:1 owner training — FMS, IMS, Task Delegation, Attendance, AppSheet, and EM-ready MIS. 24 classes × 1.5 hours (36 hours). ₹35,000. Build systems to run the business one day a week.",
  path: "/courses",
});

export default function CoursesPage() {
  return <CoursesPageContent />;
}
