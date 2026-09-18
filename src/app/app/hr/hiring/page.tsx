import { redirect } from "next/navigation";
import { PageHeader } from "@/components/saas/page-header";
import { HrSubNav } from "@/components/hr/hr-sub-nav";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import {
  listCandidates,
  listJobOpenings,
} from "@/lib/hr/hr-store";
import {
  listOfferLetters,
  buildOfferPublicUrl,
  offerWhatsAppHref,
} from "@/lib/hr/offer-letter";
import { getEffectiveHrSubModulesForUser } from "@/lib/hr/hr-access";
import { HiringAdminPanel } from "@/components/hr/hiring-admin-panel";
import { OfferLetterPanel } from "@/components/hr/offer-letter-panel";
import { hrHiringModule } from "@/app/hr-module-content";
import "@/components/hr/offer-letter.css";

function moneyNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value == null) return null;
  return typeof value === "number" ? value : value.toNumber();
}

export default async function HrHiringPage() {
  const user = await requireSession(undefined, { module: "HR" });
  const { effective: enabledSubModules, allowed } =
    await getEffectiveHrSubModulesForUser(user);
  if (!allowed("hiring")) {
    redirect("/app/hr");
  }
  const isAdmin = hasMinimumRole(user.role, "ADMIN");
  const [openings, candidates, offers] = await Promise.all([
    listJobOpenings(user.organizationId),
    listCandidates(user.organizationId),
    listOfferLetters(user.organizationId),
  ]);

  const offerRows = offers.map((offer) => {
    const publicUrl = offer.shareToken
      ? buildOfferPublicUrl(offer.shareToken)
      : null;
    return {
      id: offer.id,
      roleTitle: offer.roleTitle,
      status: offer.status,
      ctcAnnual: moneyNumber(offer.ctcAnnual),
      ctcMonthly: moneyNumber(offer.ctcMonthly),
      joiningDate: offer.joiningDate?.toISOString() ?? null,
      offerValidUntil: offer.offerValidUntil?.toISOString() ?? null,
      probationMonths: offer.probationMonths,
      publicUrl,
      waHref: publicUrl
        ? offerWhatsAppHref({
            phone: offer.candidate.phone,
            candidateName: offer.candidate.fullName,
            organizationName: user.organizationName,
            roleTitle: offer.roleTitle,
            url: publicUrl,
          })
        : null,
      sentAt: offer.sentAt?.toISOString() ?? null,
      candidate: {
        id: offer.candidate.id,
        fullName: offer.candidate.fullName,
        email: offer.candidate.email,
        phone: offer.candidate.phone,
        stage: offer.candidate.stage,
      },
    };
  });

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
        Lightweight ATS for MSME HR: job openings, candidates, and formal offer
        letters (send → accept/decline). Appointment and confirmation letters
        follow after joining.
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

      <OfferLetterPanel
        canManage={isAdmin}
        candidates={candidates.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          email: c.email,
          phone: c.phone,
          stage: c.stage,
          roleTitle: c.jobOpening?.title ?? "",
        }))}
        offers={offerRows}
      />

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
