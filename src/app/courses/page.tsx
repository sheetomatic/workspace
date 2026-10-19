import type { Metadata } from "next";
import { CoursesPageContent } from "@/components/marketing/courses-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Live 1:1 & Recorded Courses",
  description:
    "Business Owners: ₹1,10,000 + GST for system development and team training within the agreed scope. 30 classes, 60 hours. Explore live 1:1 and recorded courses.",
  path: "/courses",
});

export default function CoursesPage() {
  return <CoursesPageContent />;
}
