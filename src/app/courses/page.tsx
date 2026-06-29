import type { Metadata } from "next";
import { CoursesPageContent } from "@/components/marketing/courses-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Courses & Knowledge Transfer",
  description:
    "Free YouTube playlists and paid programs on automation, flow monitoring, dashboards, and WhatsApp for MSME teams.",
  path: "/courses",
});

export default function CoursesPage() {
  return <CoursesPageContent />;
}
