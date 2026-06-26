import Link from "next/link";
import { Suspense } from "react";
import { CaseListTable } from "@/components/legal/case-list-table";
import { CaseSearchBar } from "@/components/legal/case-search-bar";
import {
  LegalCaseCreatePanel,
  LegalCasesPageActions,
} from "@/components/legal/legal-cases-action-bar";
import { LegalListSectionNav } from "@/components/legal/legal-list-section-nav";
import { LegalListAssigneeNav } from "@/components/legal/legal-list-assignee-nav";
import { LegalViewsNav } from "@/components/legal/legal-views-nav";
import { PageHeader } from "@/components/saas/page-header";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import {
  buildLegalListDescription,
  buildLegalListQuery,
  buildLegalListTitle,
  parseLegalListSearchParams,
} from "@/lib/legal-cases/list-filters";
import { getLegalAssigneeCounts, getLegalSectionCounts, listLegalCases } from "@/lib/legal-cases/queries";
import { getLegalViewNavCounts } from "@/lib/legal-cases/view-queries";
import { requireSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";

type CasesListPageProps = {
  searchParams: Promise<{
    q?: string;
    fileStatus?: string;
    caseStage?: string;
    mine?: string;
    assignee?: string;
    section?: string;
    metric?: string;
    page?: string;
    new?: string;
  }>;
};

export default async function CasesListPage({ searchParams }: CasesListPageProps) {
  const user = await requireSession(undefined, { module: "CASES" });
  const params = await searchParams;
  const admin = isLegalAdmin(user);
  const filter = parseLegalListSearchParams(params);

  const [casePage, sectionCounts, assigneeCounts, counts] = await Promise.all([
    listLegalCases(user, {
      q: filter.q,
      fileStatus: filter.fileStatus,
      caseStage: filter.caseStage,
      mineOnly: admin && filter.mineOnly,
      assignee: filter.assignee,
      section: filter.section,
      metric: filter.metric,
      page: filter.page,
    }),
    getLegalSectionCounts(user),
    admin ? getLegalAssigneeCounts(user) : Promise.resolve({ rows: [], total: 0, mode: "doer" as const }),
    getLegalViewNavCounts(user),
  ]);

  const title = buildLegalListTitle(filter);
  const description = buildLegalListDescription(casePage.total);
  const listQuery = {
    q: params.q,
    fileStatus: params.fileStatus,
    caseStage: params.caseStage,
    mine: params.mine,
    assignee: params.assignee,
    section: params.section,
    metric: params.metric,
  };

  return (
    <div className="saas-page legal-list-page">
      <div className="legal-list-toolbar">
        <div className="legal-list-toolbar-main">
          <Link className="legal-back-link" href="/app/cases">
            &larr; Dashboard
          </Link>
          <PageHeader description={description} title={title} />
        </div>
        {admin ? (
          <Suspense
            fallback={<div aria-hidden className="legal-page-actions-shell" />}
          >
            <LegalCasesPageActions canCreate canSync />
          </Suspense>
        ) : null}
      </div>

      <Suspense fallback={null}>
        <LegalViewsNav counts={counts} />
      </Suspense>

      <LegalCaseCreatePanel canCreate={admin} />

      <section className="legal-panel legal-panel-compact">
        {sectionCounts.rows.length > 0 ? (
          <Suspense fallback={<div aria-hidden className="legal-list-section-nav-shell" />}>
            <LegalListSectionNav
              rows={sectionCounts.rows}
              total={sectionCounts.total}
            />
          </Suspense>
        ) : null}

        {admin && assigneeCounts.rows.length > 0 ? (
          <Suspense fallback={<div aria-hidden className="legal-list-assignee-nav-shell" />}>
            <LegalListAssigneeNav
              rows={assigneeCounts.rows}
              total={assigneeCounts.total}
            />
          </Suspense>
        ) : null}

        <CaseSearchBar
          assignee={params.assignee}
          caseStage={params.caseStage}
          fileStatus={params.fileStatus}
          isAdmin={admin}
          metric={params.metric}
          mineOnly={params.mine === "1"}
          q={params.q}
          section={params.section}
        />

        <div className="legal-list-table-wrap">
          <CaseListTable compact items={casePage.items} user={user} />
        </div>

        {casePage.totalPages > 1 ? (
          <div className="legal-pagination">
            <span>
              Page {casePage.page} of {casePage.totalPages}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {casePage.page > 1 ? (
                <Link
                  className="btn-ghost"
                  href={buildLegalListQuery(listQuery, casePage.page - 1)}
                >
                  Previous
                </Link>
              ) : null}
              {casePage.page < casePage.totalPages ? (
                <Link
                  className="btn-ghost"
                  href={buildLegalListQuery(listQuery, casePage.page + 1)}
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
