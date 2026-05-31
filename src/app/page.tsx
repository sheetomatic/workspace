import type { Metadata } from "next";
import { HomePage } from "@/components/marketing/home-page";

export const metadata: Metadata = {
  title: "Automation and AI Consultancy",
  description:
    "Operational control for Indian MSMEs. Client workspaces, Google Workspace systems, and business automation.",
};

export default function Home() {
  return <HomePage />;
}
