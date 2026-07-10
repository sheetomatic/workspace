import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { getHrDashboardStats } from "@/lib/hr/hr-store";
import { hrModuleOverview } from "@/app/hr-module-content";

export default async function HrOverviewPage() {
  const user = await requireSession(undefined, { module: "HR" });
  const stats = await getHrDashboardStats(user.organizationId);

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="HR & workforce"
        description={hrModuleOverview.lead}
      />
      <HrSubNav activePath="/app/hr" />

      <div className="ws-task-stats">
        <div className="ws-stat-card ws-stat-done">
          <span>Present today</span>
          <strong>{stats.presentToday}</strong>
        </div>
        <div className="ws-stat-card ws-stat-pending">
          <span>Pending leave</span>
          <strong>{stats.pendingLeave}</strong>
        </div>
        <div className="ws-stat-card ws-stat-progress">
          <span>Field check-ins today</span>
          <strong>{stats.fieldCheckInsToday}</strong>
        </div>
        <div className="ws-stat-card">
          <span>Open jobs / active candidates</span>
          <strong>
            {stats.openJobs} / {stats.activeCandidates}
          </strong>
        </div>
      </div>

      <div className="ws-hr-module-grid">
        <Link className="ws-hr-module-card" href="/app/hr/employees">
          <strong>Employee registration</strong>
          <p>
            Profiles, salary components, ESI/PF/TDS, bank details, and KYC documents
            for payroll-ready staff.
          </p>
        </Link>
        <Link className="ws-hr-module-card" href="/app/hr/attendance">
          <strong>Attendance & Leave</strong>
          <p>
            Geo-fenced check-in, facial recognition ready, leave workflow, payroll
            inputs.
          </p>
        </Link>
        <Link className="ws-hr-module-card" href="/app/hr/payroll">
          <strong>Payroll & salary slips</strong>
          <p>
            Attendance-based salary runs with printable slips (org logo letterhead).
          </p>
        </Link>
        <Link className="ws-hr-module-card" href="/app/hr/field">
          <strong>Field executive tracking</strong>
          <p>
            Separate module for sales and service teams - client geo check-ins and
            visit plans.
          </p>
        </Link>
        <Link className="ws-hr-module-card" href="/app/hr/hiring">
          <strong>Hiring & documentation</strong>
          <p>Job openings, candidate pipeline, and document checklist for HR.</p>
        </Link>
      </div>

      <p className="ws-hr-note">{hrModuleOverview.darwinboxNote}</p>
    </div>
  );
}
