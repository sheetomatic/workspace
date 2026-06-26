import Link from "next/link";
import type { LegalCase, LegalCaseDocument, User } from "@prisma/client";
import {
  LEGAL_SECTION_LABELS,
  type LegalSectionNumber,
  categoriesForSection,
} from "@/lib/legal-cases/constants";
import {
  assignedSectionsForCode,
  canEditLegalSection,
  canViewLegalSection,
  isLegalAdmin,
  userStaffCode,
  viewableSectionsForUser,
} from "@/lib/legal-cases/access";
import type { SessionUser } from "@/lib/auth";
import { LegalDocumentUploadForm } from "@/components/legal/legal-document-upload-form";
import { LegalCaseAlerts } from "@/components/legal/legal-case-alerts";
import { ProcessDiaryPanel } from "@/components/legal/process-diary-panel";
import "./legal-cases.css";

type CaseWithDocs = LegalCase & {
  documents: (LegalCaseDocument & {
    uploadedBy: Pick<User, "name" | "email">;
  })[];
};

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="legal-field">
      <span>{label}</span>
      <strong>{value?.trim() ? value : "-"}</strong>
    </div>
  );
}

function sectionFields(section: LegalSectionNumber, legalCase: LegalCase) {
  switch (section) {
    case 1:
      return (
        <>
          <Field label="File No." value={legalCase.fileNumber} />
          <Field label="MCC No." value={legalCase.mccNumber} />
          <Field label="Applicant" value={legalCase.applicant} />
          <Field label="Category" value={legalCase.category} />
          <Field label="Non applicant" value={legalCase.nonApplicant} />
        </>
      );
    case 2:
      return (
        <>
          <Field label="Previous date" value={legalCase.prevDate} />
          <Field label="Next date" value={legalCase.nextDate} />
          <Field label="Case stage" value={legalCase.caseStage} />
          <Field label="File status" value={legalCase.fileStatus} />
          <Field label="AMD and CC status" value={legalCase.amdCcStatus} />
          <Field label="F-No" value={legalCase.fNo} />
          <Field label="Court" value={legalCase.court} />
          <Field label="Remarks" value={legalCase.remarks} />
          <Field label="Co. advocate" value={legalCase.coAdvocate} />
          <Field label="Company" value={legalCase.company} />
          <Field label="Signing date" value={legalCase.signingDate} />
          <Field label="Case filed" value={legalCase.caseFiled} />
          <Field label="Client advance" value={legalCase.clientAdvance} />
          <Field label="Person responsible" value={legalCase.s2Responsible} />
        </>
      );
    case 3:
      return <Field label="Person responsible" value={legalCase.s3Responsible} />;
    case 4:
      return <Field label="Person responsible" value={legalCase.s4Responsible} />;
    case 5:
      return <Field label="Person responsible" value={legalCase.s5Responsible} />;
    case 6:
      return <Field label="Person responsible" value={legalCase.s6Responsible} />;
    case 7:
      return <Field label="Person responsible" value={legalCase.s7Responsible} />;
    default:
      return <p>Field work and evidence details will expand in the next phase.</p>;
  }
}

export function CaseDetailView({
  user,
  legalCase,
  activeSection,
}: {
  user: SessionUser;
  legalCase: CaseWithDocs;
  activeSection: LegalSectionNumber;
}) {
  const sections = viewableSectionsForUser(user, legalCase);
  const sectionDocs = legalCase.documents.filter(
    (doc) =>
      doc.section === activeSection &&
      canViewLegalSection(user, legalCase, doc.section as LegalSectionNumber),
  );
  const canEdit = canEditLegalSection(user, legalCase, activeSection);
  const categories = canEdit ? categoriesForSection(activeSection) : [];
  const admin = isLegalAdmin(user);
  const mySections = assignedSectionsForCode(legalCase, userStaffCode(user));

  return (
    <div>
      <header className="ws-page-header" style={{ marginBottom: "1rem" }}>
        <div className="legal-case-detail-head">
          <div>
            <h1>
              File {legalCase.fileNumber}
              {legalCase.mccNumber ? ` - ${legalCase.mccNumber}` : ""}
            </h1>
            <p>
              {legalCase.applicant ?? "Unknown applicant"} | {legalCase.fileStatus ?? "No status"} |{" "}
              {legalCase.caseStage ?? "No stage"}
              {!admin && mySections.length > 0
                ? ` | Your sections: ${mySections.map((section) => `S${section}`).join(", ")}`
                : ""}
            </p>
          </div>
          <div className="legal-case-detail-actions">
            <Link className="btn-cta btn-secondary" href={`/app/cases/${legalCase.id}/file-cover`}>
              File cover
            </Link>
            {admin ? (
              <Link className="btn-ghost" href="/app/cases/settings">
                Settings
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <nav aria-label="Case sections" className="legal-section-tabs">
        {sections.map((section) => {
          const editable = canEditLegalSection(user, legalCase, section);
          return (
            <Link
              key={section}
              className={
                section === activeSection
                  ? "legal-section-tab active"
                  : editable
                    ? "legal-section-tab"
                    : "legal-section-tab readonly"
              }
              href={`/app/cases/${legalCase.id}?section=${section}`}
            >
              {section}. {LEGAL_SECTION_LABELS[section]}
              {section === 1 && !admin ? " (overview)" : ""}
            </Link>
          );
        })}
      </nav>

      <div className="legal-panel" style={{ marginBottom: "1rem" }}>
        <h3>
          Section {activeSection}: {LEGAL_SECTION_LABELS[activeSection]}
          {!canEdit ? (activeSection === 1 && !admin ? " (overview)" : " (read only)") : ""}
        </h3>
        <LegalCaseAlerts legalCase={legalCase} section={activeSection} />
        <div className="legal-field-grid">{sectionFields(activeSection, legalCase)}</div>
      </div>

      {activeSection === 2 && canEdit ? (
        <div style={{ marginBottom: "1rem" }}>
          <ProcessDiaryPanel
            legalCase={{
              id: legalCase.id,
              sectionData: legalCase.sectionData,
              nextDate: legalCase.nextDate,
              mccNumber: legalCase.mccNumber,
              coAdvocate: legalCase.coAdvocate,
              amdCcStatus: legalCase.amdCcStatus,
            }}
          />
        </div>
      ) : null}

      {categories.length > 0 ? (
        <div className="legal-panel">
          <h3>Documents</h3>
          <p style={{ marginTop: 0, color: "#64748b", fontSize: "0.88rem" }}>
            Upload as many files as needed. Name each file when uploading (e.g. Agreement page 1).
          </p>
          {categories.map((category) => {
            const docs = sectionDocs.filter((doc) => doc.category === category.key);
            return (
              <div className="legal-doc-category" key={category.key}>
                <div className="legal-doc-category-head">
                  <h4>{category.label}</h4>
                  <span>
                    {docs.length} file{docs.length === 1 ? "" : "s"}
                  </span>
                </div>
                {docs.length > 0 ? (
                  <ul className="legal-doc-list">
                    {docs.map((doc) => (
                      <li key={doc.id}>
                        <span>
                          <strong>{doc.displayName}</strong>
                          <br />
                          <small>
                            {doc.uploadedBy.name ?? doc.uploadedBy.email} |{" "}
                            {new Date(doc.createdAt).toLocaleString()}
                          </small>
                        </span>
                        <a
                          className="btn-ghost"
                          href={`/api/legal-cases/documents/${doc.id}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          View
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>
                    No files uploaded yet.
                  </p>
                )}
                {canEdit ? (
                  <LegalDocumentUploadForm
                    caseId={legalCase.id}
                    category={category}
                    section={activeSection}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
