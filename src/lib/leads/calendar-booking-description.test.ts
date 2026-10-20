import { describe, expect, it } from "vitest";
import { matchesBookingTitle, parseCalendarBookingDescription } from "./calendar-booking-description";
import { normalizeBooking, type CalendarEvent } from "./google-calendar-bookings";

const event: CalendarEvent = {
  id: "phone-booking", summary: "Bhaskar | Requirement Understanding Session",
  start: { dateTime: "2026-10-21T12:00:00+05:30", timeZone: "Asia/Kolkata" },
  end: { dateTime: "2026-10-21T12:30:00+05:30" },
  description: "Business phone: +91 91234 56789\nCustomer name: Bhaskar\nCustomer phone: +91 98765 43210\nChat with business: https://wa.me/919123456789\nBooking notes:\nRequirement Notes: WhatsApp task assignment\nLocation: Video call",
};
const titles = ["Requirement Understanding Session"];
describe("phone-based Calendar booking format", () => {
  it("maps the screenshot format without an email attendee, using only customer contact data", () => {
    const booking = normalizeBooking(event, titles)!;
    expect(booking).toMatchObject({ attendeeName: "Bhaskar", attendeePhone: "+919876543210", attendeeEmail: null, status: "CONFIRMED" });
    expect(booking.startsAt.toISOString()).toBe("2026-10-21T06:30:00.000Z");
    expect(booking.bookingNotes).toBe("Requirement: WhatsApp task assignment\nLocation: Video call");
    expect(JSON.stringify(booking)).not.toContain("91234");
  });
  it("extracts labelled data from HTML without retaining executable markup or host links", () => {
    const result = parseCalendarBookingDescription('<div><b>Customer name:</b> Bhaskar &amp; Team</div><div>Customer phone: 9876543210</div><div>Requirement Notes: FMS &amp; IMS</div><script>secret()</script>');
    expect(result).toEqual({ customerName: "Bhaskar & Team", customerPhone: "+919876543210", notes: "Requirement: FMS & IMS" });
  });
  it("does not import free slots, wrong schedule titles, or unrelated personal events", () => {
    expect(normalizeBooking({ ...event, description: undefined }, titles)).toBeNull();
    expect(normalizeBooking({ ...event, summary: "Bhaskar | Personal dinner" }, titles)).toBeNull();
    expect(normalizeBooking({ ...event, summary: "Other person | Requirement Understanding Session" }, titles)).toBeNull();
    expect(matchesBookingTitle("Requirement Understanding Session extended", titles, "Bhaskar")).toBe(false);
  });
  it("never substitutes the business number for a missing or invalid customer number", () => {
    for (const raw of ["Business phone: +91 91234 56789\nCustomer name: Bhaskar", "Customer name: Bhaskar\nCustomer phone: invalid", "Customer name:\nCustomer phone: +919876543210"]) {
      expect(normalizeBooking({ ...event, description: raw }, titles)).toBeNull();
    }
  });
  it("retains explicit guest declines and cancellation semantics", () => {
    expect(normalizeBooking({ ...event, attendees: [{ email: "guest@example.test", responseStatus: "declined" }] }, titles)?.status).toBe("CANCELLED");
    expect(normalizeBooking({ ...event, status: "cancelled" }, titles)).toBeNull();
  });
});
