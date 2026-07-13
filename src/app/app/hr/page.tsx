import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getHrDashboardStats, getOrCreateHrSettings } from "@/lib/hr/hr-store";
import {
  isHrSubModuleEnabled,
  resolveEnabledHrSubModules,
  type HrSubModuleId,
} from "@/lib/hr/hr-sub-modules";
import { hrModuleOverview } from "@/app/hr-module-content";

export default async function HrOverviewPage() {
  const user = await requireSession(undefined, { module: "HR" });
  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  const canSeeTeamStats = hasMinimumRole(user.role, "MANAGER");
  const [stats, hrSettings] = await Promise.all([
    canSeeTeamStats
      ? getHrDashboardStats(user.organizationId)
      : Promise.resolve({
          presentToday: 0,
          pendingLeave: 0,
          fieldCheckInsToday: 0,
          openJobs: 0,
          activeCandidates: 0,
        }),
    getOrCreateHrSettings(user.organizationId),
  ]);
  const enabledSubModules = resolveEnabledHrSubModules(
    hrSettings.enabledHrSubModules,
  );
  const enabled = (id: HrSubModuleId) =>
    isHrSubModuleEnabled(hrSettings.enabledHrSubModules, id);

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="HR & workforce"
        description={hrModuleOverview.lead}
      />
      <HrSubNav
        activePath="/app/hr"
        isAdmin={isAdmin}
        enabledSubModules={enabledSubModules}
      />

      {canSeeTeamStats ? (
      <div className="ws-task-stats">
        {enabled("attendance") ? (
          <div className="ws-stat-card ws-stat-done">
            <span>Present today</span>
            <strong>{stats.presentToday}</strong>
          </div>
        ) : null}
        {enabled("leave") ? (
          <div className="ws-stat-card ws-stat-pending">
            <span>Pending leave</span>
            <strong>{stats.pendingLeave}</strong>
          </div>
        ) : null}
        {enabled("field") ? (
          <div className="ws-stat-card ws-stat-progress">
            <span>Field check-ins today</span>
            <strong>{stats.fieldCheckInsToday}</strong>
          </div>
        ) : null}
        {enabled("hiring") ? (
          <div className="ws-stat-card">
            <span>Open jobs / active candidates</span>
            <strong>
              {stats.openJobs} / {stats.activeCandidates}
            </strong>
          </div>
        ) : null}
      </div>
      ) : null}

      <div className="ws-hr-module-grid">
        {enabled("employees") ? (
          <Link className="ws-hr-module-card" href="/app/hr/employees">
            <strong>Employee registration</strong>
            <p>
              Profiles, salary components, ESI/PF/TDS, bank details, and KYC documents
              for payroll-ready staff.
            </p>
          </Link>
        ) : null}
        {enabled("attendance") || enabled("leave") ? (
          <Link
            className="ws-hr-module-card"
            href={enabled("attendance") ? "/app/hr/attendance" : "/app/hr/leave"}
          >
            <strong>Attendance & Leave</strong>
            <p>
              Geo-fenced check-in, facial recognition ready, leave workflow, payroll
              inputs.
            </p>
          </Link>
        ) : null}
        {enabled("payroll") ? (
          <Link className="ws-hr-module-card" href="/app/hr/payroll">
            <strong>Payroll & salary slips</strong>
            <p>
              Attendance-based salary runs with printable slips (org logo letterhead).
            </p>
          </Link>
        ) : null}
        {enabled("field") ? (
          <Link className="ws-hr-module-card" href="/app/hr/field">
            <strong>Field executive tracking</strong>
            <p>
              Separate module for sales and service teams - client geo check-ins and
              visit plans.
            </p>
          </Link>
        ) : null}
        {enabled("hiring") ? (
          <Link className="ws-hr-module-card" href="/app/hr/hiring">
            <strong>Hiring & documentation</strong>
            <p>Job openings, candidate pipeline, and document checklist for HR.</p>
          </Link>
        ) : null}
      </div>

      <p className="ws-hr-note">{hrModuleOverview.darwinboxNote}</p>
    </div>
  );
}
