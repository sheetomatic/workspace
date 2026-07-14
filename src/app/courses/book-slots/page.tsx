import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { CoursesBookSlots } from "@/components/marketing/courses-book-slots";
import { GoogleCalendarBookingEmbed } from "@/components/marketing/google-calendar-booking-embed";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/courses-book-slots-page.css";

export const metadata: Metadata = marketingMetadata({
  title: "Book training slots | Sheetomatic Courses",
  description:
    "Book your 1:1 Sheets / AppSheet / Looker training slots on Google Calendar.",
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
      <main className="course-book-page">
        <div className="course-book-page-inner">
          <p className="course-book-back">
            <Link href="/courses">← Courses</Link>
          </p>
          <h1 className="course-book-title">Book training slots</h1>
          <p className="course-book-lead">
            Pick an open 1:1 Google Sheets · AppSheet · Looker Studio slot on
            Google Calendar. On mobile, scroll the calendar area or tap Open
            calendar.
          </p>

          <GoogleCalendarBookingEmbed title="Google Calendar · available slots" />

          {token ? (
            <section className="course-book-status">
              <h2>Your enrollment</h2>
              <CoursesBookSlots token={token} />
            </section>
          ) : (
            <p className="course-book-note">
              Already enrolled? Open the booking link from your confirmation
              email or WhatsApp to see enrollment status. Need help?{" "}
              <Link href="/contact">Contact us</Link>.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
