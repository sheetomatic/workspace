import Link from "next/link";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { listUpcomingTrainingSlots } from "@/lib/courses/slots";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";

export default async function CrmTrainingPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  const [slots, totalScheduled, enrollments] = await Promise.all([
    listUpcomingTrainingSlots({
      organizationId: user.organizationId,
      take: 100,
    }),
    prisma.trainingCourseSlot.count({
      where: {
        organizationId: user.organizationId,
        status: "SCHEDULED",
      },
    }),
    prisma.courseEnrollment.count({
      where: { organizationId: user.organizationId },
    }),
  ]);

  return (
    <CrmSubmoduleShell
      title="Training"
      description="Upcoming training slots linked to CRM enrollments."
      kpis={[
        { label: "Upcoming slots", value: String(slots.length), accent: "blue" },
        { label: "Scheduled total", value: String(totalScheduled) },
        { label: "Enrollments", value: String(enrollments), accent: "success" },
      ]}
    >
      <div className="crm-submodule-table-wrap">
        <table className="crm-submodule-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Student</th>
              <th>Session</th>
              <th>Cohort</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 ? (
              <tr>
                <td colSpan={5} className="leads-machine-muted">
                  No upcoming training slots.
                </td>
              </tr>
            ) : (
              slots.map((slot) => (
                <tr key={slot.id}>
                  <td>
                    {new Date(slot.startsAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    <strong>{slot.enrollment.name}</strong>
                    <div className="leads-machine-muted">
                      {slot.enrollment.phone || slot.enrollment.email || "—"}
                    </div>
                  </td>
                  <td>
                    #{slot.sessionNumber} · {slot.title}
                  </td>
                  <td>{slot.enrollment.cohort}</td>
                  <td>
                    {slot.enrollment.inboundLeadId ? (
                      <Link
                        className="btn-secondary btn-sm"
                        href={`/app/leads?leadId=${slot.enrollment.inboundLeadId}&period=all`}
                      >
                        Open CRM
                      </Link>
                    ) : (
                      <span className="leads-machine-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </CrmSubmoduleShell>
  );
}
