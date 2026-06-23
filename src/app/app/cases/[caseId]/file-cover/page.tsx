import Link from "next/link";
import { notFound } from "next/navigation";
import { FileCoverWizard } from "@/components/legal/file-cover-wizard";
import { fileCoverFromLegalCase } from "@/lib/legal-cases/file-cover";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { getLegalCaseForUser } from "@/lib/legal-cases/queries";
import { requireSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";

type PageProps = {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditFileCoverPage({ params, searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "CASES" });
  const { caseId } = await params;
  const query = await searchParams;
  const legalCase = await getLegalCaseForUser(user, caseId);

  if (!legalCase) {
    notFound();
  }

  const canEdit = isLegalAdmin(user);

  return (
    <div className="saas-page">
      <div className="legal-file-cover-toolbar">
        <Link className="btn-ghost" href={`/app/cases/${legalCase.id}`}>
          Back to case
        </Link>
        <Link className="btn-cta btn-secondary" href={`/app/cases/${legalCase.id}/file-cover/print`} target="_blank">
          Print file cover
        </Link>
      </div>

      {query.saved === "1" ? (
        <p className="saas-form-message ok">File cover saved and sheet row synced.</p>
      ) : null}

      {canEdit ? (
        <FileCoverWizard
          initialFileCover={fileCoverFromLegalCase(legalCase)}
          legalCase={legalCase}
        />
      ) : (
        <p>You can view the printable file cover but cannot edit it.</p>
      )}
    </div>
  );
}
