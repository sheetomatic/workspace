import { redirect } from "next/navigation";
import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import {
  getOrCreateHrSettings,
  listCandidates,
  listJobOpenings,
} from "@/lib/hr/hr-store";
import {
  requireHrSubModule,
  resolveEnabledHrSubModules,
} from "@/lib/hr/hr-sub-modules";
import { HiringAdminPanel } from "@/components/hr/hiring-admin-panel";
import { hrHiringModule } from "@/app/hr-module-content";

export default async function HrHiringPage() {
  const user = await requireSession(undefined, { module: "HR" });
  const hrSettings = await getOrCreateHrSettings(user.organizationId);
  if (!requireHrSubModule(hrSettings.enabledHrSubModules, "hiring")) {
    redirect("/app/hr");
  }
  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  const enabledSubModules = resolveEnabledHrSubModules(
    hrSettings.enabledHrSubModules,
  );
  const [openings, candidates] = await Promise.all([
    listJobOpenings(user.organizationId),
    listCandidates(user.organizationId),
  ]);

  return (
    <div className="saas-page ws-hr-page">
      <PageHeader
        title="Hiring & documentation"
        description={hrHiringModule.tagline}
      />
      <HrSubNav
        activePath="/app/hr/hiring"
        isAdmin={isAdmin}
        enabledSubModules={enabledSubModules}
      />

      <p className="ws-hr-note">
        Lightweight ATS for MSME HR: job openings, candidate stages, and document
        links. Inspired by enterprise hire-to-retire platforms, scoped for teams
        that outgrow spreadsheets.
      </p>

      {isAdmin ? (
        <HiringAdminPanel
          openings={openings.map((o) => ({
            id: o.id,
            title: o.title,
            isOpen: o.isOpen,
          }))}
        />
      ) : null}

      <section className="ws-hr-panel">
        <h2>Open roles</h2>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Location</th>
                <th>Candidates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {openings.length === 0 ? (
                <tr>
                  <td colSpan={4}>No job openings yet.</td>
                </tr>
              ) : (
                openings.map((job) => (
                  <tr key={job.id}>
                    <td>{job.title}</td>
                    <td>{job.location ?? "-"}</td>
                    <td>{job._count.candidates}</td>
                    <td>{job.isOpen ? "Open" : "Closed"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ws-hr-panel">
        <h2>Candidate pipeline</h2>
        <div className="ws-hr-table-wrap">
          <table className="ws-hr-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Stage</th>
                <th>Contact</th>
                <th>Documents</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6}>No candidates in pipeline.</td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id}>
                    <td>{c.fullName}</td>
                    <td>{c.jobOpening?.title ?? "General"}</td>
                    <td>{c.stage}</td>
                    <td>
                      {[c.email, c.phone].filter(Boolean).join(" | ") || "-"}
                    </td>
                    <td>
                      {c.documents.length
                        ? c.documents.map((d) => d.label).join(", ")
                        : "-"}
                    </td>
                    <td>{c.owner?.name ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
