import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { GoogleCalendarBookingEmbed } from "@/components/marketing/google-calendar-booking-embed";
import { requireSession } from "@/lib/require-session";
import { isPrimaryOrganization } from "@/lib/platform";
import {
  buildTrainingGoogleCalendarUrl,
  formatSlotWhen,
  listUpcomingTrainingSlots,
} from "@/lib/courses/slots";
import {
  COURSE_GOOGLE_CALENDAR_BOOKING_URL,
  courseCohortLabel,
} from "@/lib/content/courses-enrollment";

export default async function MySpaceTrainingPage() {
  const user = await requireSession("MANAGER");
  const isPrimary = await isPrimaryOrganization(user.organizationId);
  const platformWide = user.isSuperAdmin || isPrimary;

  const slots = await listUpcomingTrainingSlots({
    organizationId: platformWide ? null : user.organizationId,
    platformWide,
    take: 60,
  });

  return (
    <div className="saas-page ws-ims-sf">
      <div className="ws-ims-page">
        <TaskPageToolbar
          title="Booked training slots"
          description="Book on Google Calendar or review upcoming cohort sessions. Clients and owners get email + WhatsApp alerts when slots are booked."
          actions={
            <>
              <a
                href={COURSE_GOOGLE_CALENDAR_BOOKING_URL}
                className="ws-btn ws-btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Google Calendar
              </a>
              <Link href="/app/my-space" className="ws-btn ws-btn-secondary">
                Back to My Space
              </Link>
            </>
          }
        />

        <section className="ws-ims-panel" style={{ marginBottom: "1rem" }}>
          <GoogleCalendarBookingEmbed title="Google Calendar · book training slots" />
        </section>

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>Upcoming sessions</h2>
          </div>
          {slots.length === 0 ? (
            <p className="ws-apple-record-empty">
              No upcoming training slots yet. Book from CRM → Training tab, Approvals
              (confirm payment), or the client booking link on /courses/book-slots.
            </p>
          ) : (
            <div className="ws-ims-table-wrap">
              <table className="ws-ims-table ws-apple-data-table">
                <thead>
                  <tr>
                    <th>When (IST)</th>
                    <th>Student</th>
                    <th>Session</th>
                    <th>Cohort</th>
                    <th>Calendar</th>
                    <th>CRM</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot) => (
                    <tr key={slot.id}>
                      <td className="ws-apple-cell-primary">
                        {formatSlotWhen(slot.startsAt)}
                      </td>
                      <td className="ws-apple-cell-secondary">
                        {slot.enrollment.name}
                        <br />
                        <small>
                          {slot.enrollment.phone} · {slot.enrollment.email}
                        </small>
                      </td>
                      <td>#{slot.sessionNumber}</td>
                      <td>{courseCohortLabel(slot.enrollment.cohort)}</td>
                      <td>
                        <a
                          href={buildTrainingGoogleCalendarUrl({
                            title: slot.title,
                            startsAt: slot.startsAt,
                            endsAt: slot.endsAt,
                            meetUrl: slot.meetUrl,
                            studentName: slot.enrollment.name,
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Google Calendar
                        </a>
                      </td>
                      <td>
                        {slot.enrollment.inboundLeadId ? (
                          <Link
                            href={`/app/leads?leadId=${slot.enrollment.inboundLeadId}`}
                          >
                            Open lead
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
