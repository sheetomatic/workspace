import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  LegalCaseCreatePanel,
  LegalCasesPageActions,
} from "@/components/legal/legal-cases-action-bar";
import { LegalCaseViewTable } from "@/components/legal/legal-case-view-table";
import { LegalRunningInsights } from "@/components/legal/legal-running-insights";
import { LegalViewFilters } from "@/components/legal/legal-view-filters";
import { LegalViewsNav } from "@/components/legal/legal-views-nav";
import { PageHeader } from "@/components/saas/page-header";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import {
  buildLegalViewListQuery,
  getLegalViewNavCounts,
  getLegalViewFilterOptions,
  getRunningInsights,
  listLegalViewCases,
  type LegalViewListFilter,
} from "@/lib/legal-cases/view-queries";
import {
  legalViewByKey,
  legalViewColumns,
  type LegalViewKey,
} from "@/lib/legal-cases/views";
import { requireSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";

type ViewPageProps = {
  params: Promise<{ viewKey: string }>;
  searchParams: Promise<{
    category?: string;
    page?: string;
    assignee?: string;
    fileStatus?: string;
    caseStage?: string;
    section?: string;
  }>;
};

function parseViewFilters(
  searchParams: Awaited<ViewPageProps["searchParams"]>,
): LegalViewListFilter {
  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  return {
    category: searchParams.category,
    assignee: searchParams.assignee,
    fileStatus: searchParams.fileStatus,
    caseStage: searchParams.caseStage,
    section: searchParams.section,
    page,
  };
}

export default async function LegalCaseViewPage({
  params,
  searchParams,
}: ViewPageProps) {
  const user = await requireSession(undefined, { module: "CASES" });
  const { viewKey: rawKey } = await params;
  const view = legalViewByKey(rawKey);
  if (!view || view.key === "all") {
    notFound();
  }

  const viewKey = view.key as LegalViewKey;
  const resolvedSearchParams = await searchParams;
  const filters = parseViewFilters(resolvedSearchParams);
  const admin = isLegalAdmin(user);

  const [casePage, filterOptions, counts, runningInsights] = await Promise.all([
    listLegalViewCases(user, viewKey, filters),
    getLegalViewFilterOptions(user),
    getLegalViewNavCounts(user),
    viewKey === "running" ? getRunningInsights(user) : Promise.resolve(null),
  ]);

  const columns = legalViewColumns(viewKey);
  const listQuery = buildLegalViewListQuery(filters);

  return (
    <div className="saas-page legal-list-page">
      <div className="legal-list-toolbar">
        <div className="legal-list-toolbar-main">
          <Link className="legal-back-link" href="/app/cases">
            &larr; Dashboard
          </Link>
          <PageHeader
            description={`${casePage.total.toLocaleString()} cases - ${view.description}`}
            title={view.label}
          />
          {viewKey === "new-cases" ? (
            <Link
              className="btn-ghost legal-print-link"
              href="/app/cases/print/to-be-filed"
            >
              Print / sort list
            </Link>
          ) : null}
          {viewKey === "diary" ? (
            <>
              <Link className="btn-ghost legal-print-link" href="/app/cases/print/diary">
                Print court diary
              </Link>
              <Link
                className="btn-ghost legal-print-link"
                href="/app/cases/views/diary/quick-update"
              >
                Quick update (mobile)
              </Link>
            </>
          ) : null}
          {viewKey === "statement" ? (
            <Link
              className="btn-ghost legal-print-link"
              href="/app/cases/print/statement"
            >
              Print statement list
            </Link>
          ) : null}
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
        <Suspense fallback={null}>
          <LegalViewFilters
            current={{
              category: filters.category,
              assignee: filters.assignee,
              fileStatus: filters.fileStatus,
              caseStage: filters.caseStage,
              section: filters.section,
            }}
            options={filterOptions}
            showCategory={view.categoryFilter}
          />
        </Suspense>

        {runningInsights ? (
          <LegalRunningInsights insights={runningInsights} />
        ) : null}

        <LegalCaseViewTable columns={columns} items={casePage.items} />

        {casePage.totalPages > 1 ? (
          <div className="legal-pagination">
            <span>
              Page {casePage.page} of {casePage.totalPages}
            </span>
            <div className="legal-pagination-actions">
              {casePage.page > 1 ? (
                <Link
                  className="btn-ghost"
                  href={`?${new URLSearchParams({
                    ...Object.fromEntries(listQuery),
                    page: String(casePage.page - 1),
                  }).toString()}`}
                >
                  Previous
                </Link>
              ) : null}
              {casePage.page < casePage.totalPages ? (
                <Link
                  className="btn-ghost"
                  href={`?${new URLSearchParams({
                    ...Object.fromEntries(listQuery),
                    page: String(casePage.page + 1),
                  }).toString()}`}
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
