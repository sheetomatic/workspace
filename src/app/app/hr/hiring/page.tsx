import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import {
  listCandidates,
  listJobOpenings,
} from "@/lib/hr/hr-store";
import {
  addCandidateAction,
  createJobOpeningAction,
} from "@/lib/hr/hr-actions";
import { hrHiringModule } from "@/app/hr-module-content";

export default async function HrHiringPage() {
  const user = await requireSession(undefined, { module: "HR" });
  const isAdmin = hasMinimumRole(user.role, "ADMIN");
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
      <HrSubNav activePath="/app/hr/hiring" isAdmin={isAdmin} />

      <p className="ws-hr-note">
        Lightweight ATS for MSME HR: job openings, candidate stages, and document
        links. Inspired by enterprise hire-to-retire platforms, scoped for teams
        that outgrow spreadsheets.
      </p>

      {isAdmin ? (
        <div className="ws-hr-split">
          <section className="ws-hr-panel">
            <h2>New job opening</h2>
            <form action={createJobOpeningAction} className="ws-hr-form">
              <label>
                Title
                <input name="title" type="text" required />
              </label>
              <label>
                Location
                <input name="location" type="text" />
              </label>
              <label>
                Description
                <textarea name="description" rows={4} />
              </label>
              <button type="submit" className="btn-cta btn-primary">
                Publish opening
              </button>
            </form>
          </section>

          <section className="ws-hr-panel">
            <h2>Add candidate</h2>
            <form action={addCandidateAction} className="ws-hr-form">
              <label>
                Full name
                <input name="fullName" type="text" required />
              </label>
              <label>
                Email
                <input name="email" type="email" />
              </label>
              <label>
                Phone
                <input name="phone" type="tel" />
              </label>
              <label>
                Job opening
                <select name="jobOpeningId" defaultValue="">
                  <option value="">General application</option>
                  {openings
                    .filter((o) => o.isOpen)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                </select>
              </label>
              <button type="submit" className="btn-cta btn-primary">
                Add to pipeline
              </button>
            </form>
          </section>
        </div>
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
