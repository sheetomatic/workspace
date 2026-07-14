import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { CoursesBookSlots } from "@/components/marketing/courses-book-slots";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Book training slots | Sheetomatic Courses",
  description:
    "Pick your first 1:1 Sheets / AppSheet / Looker session date and book the full cohort calendar.",
  path: "/courses/book-slots",
});

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function CoursesBookSlotsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  return (
    <MarketingPage>
      <SiteHeader />
      <main className="saas-page" style={{ padding: "2.5rem 1.25rem 4rem" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ marginBottom: 8 }}>
            <Link href="/courses">← Courses</Link>
          </p>
          <h1 style={{ fontSize: "1.75rem", marginBottom: 8 }}>
            Book training slots
          </h1>
          <p style={{ color: "#475569", marginBottom: 24 }}>
            Schedule your 1:1 Google Sheets · AppSheet · Looker Studio sessions
            (meeting-style calendar). Alerts go to you and Sheetomatic by email
            and WhatsApp.
          </p>
          {token ? (
            <CoursesBookSlots token={token} />
          ) : (
            <p>
              Open the booking link from your enrollment confirmation email or
              WhatsApp message. Need help?{" "}
              <Link href="/contact">Contact us</Link>.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
