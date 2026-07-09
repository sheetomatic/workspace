import Link from "next/link";
import { notFound } from "next/navigation";
import { FileCoverPrintView } from "@/components/legal/file-cover-print-view";
import { PrintFileCoverButton } from "@/components/legal/file-cover-print-toolbar";
import { getLegalCaseForUser } from "@/lib/legal-cases/queries";
import { requireLegalCasesSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";

type PageProps = {
  params: Promise<{ caseId: string }>;
};

export default async function FileCoverPrintPage({ params }: PageProps) {
  const user = await requireLegalCasesSession();
  const { caseId } = await params;
  const legalCase = await getLegalCaseForUser(user, caseId);

  if (!legalCase) {
    notFound();
  }

  return (
    <div className="saas-page legal-file-cover-print-page">
      <div className="legal-file-cover-print-toolbar no-print">
        <Link className="btn-ghost" href={`/app/cases/${legalCase.id}/file-cover`}>
          Back to file cover
        </Link>
        <PrintFileCoverButton />
      </div>
      <FileCoverPrintView legalCase={legalCase} />
    </div>
  );
}
