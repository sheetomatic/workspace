import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CaseDetailView } from "@/components/legal/case-detail-view";
import type { LegalSectionNumber } from "@/lib/legal-cases/constants";
import { canViewLegalSection, viewableSectionsForUser } from "@/lib/legal-cases/access";
import { getLegalCaseForUser } from "@/lib/legal-cases/queries";
import { requireSession } from "@/lib/require-session";

type CaseDetailPageProps = {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ section?: string }>;
};

function parseSection(value?: string): LegalSectionNumber {
  const section = Number(value ?? "1");
  if (section >= 1 && section <= 8) {
    return section as LegalSectionNumber;
  }
  return 1;
}

export default async function CaseDetailPage({
  params,
  searchParams,
}: CaseDetailPageProps) {
  const user = await requireSession(undefined, { module: "CASES" });
  const { caseId } = await params;
  const query = await searchParams;
  const legalCase = await getLegalCaseForUser(user, caseId);

  if (!legalCase) {
    notFound();
  }

  const activeSection = parseSection(query.section);
  const allowedSections = viewableSectionsForUser(user, legalCase);
  if (!canViewLegalSection(user, legalCase, activeSection)) {
    const fallback = allowedSections[0] ?? 1;
    redirect(`/app/cases/${legalCase.id}?section=${fallback}`);
  }

  return (
    <div className="saas-page">
      <p style={{ marginBottom: "1rem" }}>
        <Link className="btn-ghost" href="/app/cases">
          ? Back to cases
        </Link>
      </p>
      <CaseDetailView
        activeSection={activeSection}
        legalCase={legalCase}
        user={user}
      />
    </div>
  );
}
