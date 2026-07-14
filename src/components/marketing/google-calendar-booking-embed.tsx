"use client";

import {
  COURSE_GOOGLE_CALENDAR_BOOKING_URL,
  COURSE_GOOGLE_CALENDAR_EMBED_URL,
} from "@/lib/content/courses-enrollment";
import "./google-calendar-booking-embed.css";

type Props = {
  title?: string;
  /** Compact height for drawer / modal contexts. */
  compact?: boolean;
  className?: string;
};

/**
 * Embeds Sheetomatic Google Calendar Appointment Schedule.
 * Always includes an open-in-new-tab fallback for mobile / blocked iframes.
 */
export function GoogleCalendarBookingEmbed({
  title = "Pick a training slot",
  compact = false,
  className,
}: Props) {
  return (
    <section
      className={`gcal-booking${compact ? " is-compact" : ""}${
        className ? ` ${className}` : ""
      }`}
      aria-label={title}
    >
      <div className="gcal-booking-head">
        <div>
          <h3 className="gcal-booking-title">{title}</h3>
          <p className="gcal-booking-help">
            Choose an open slot on Google Calendar. Scroll inside the calendar
            if needed, or open the full booking page.
          </p>
        </div>
        <a
          className="btn-cta btn-secondary btn-compact gcal-booking-open"
          href={COURSE_GOOGLE_CALENDAR_BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open calendar
        </a>
      </div>

      <div className="gcal-booking-frame-wrap">
        <iframe
          title={title}
          src={COURSE_GOOGLE_CALENDAR_EMBED_URL}
          className="gcal-booking-frame"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <p className="gcal-booking-fallback">
        Calendar not loading?{" "}
        <a
          href={COURSE_GOOGLE_CALENDAR_BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Book on Google Calendar
        </a>
        .
      </p>
    </section>
  );
}
