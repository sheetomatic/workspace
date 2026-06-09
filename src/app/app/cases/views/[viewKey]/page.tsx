import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  LegalCaseCreatePanel,
  LegalCasesPageActions,
} from "@/components/legal/legal-cases-action-bar";
import { LegalCaseViewTable } from "@/components/legal/legal-case-view-table";
import { LegalCategoryFilter } from "@/components/legal/legal-category-filter";
import { LegalRunningInsights } from "@/components/legal/legal-running-insights";
import { LegalViewsNav } from "@/components/legal/legal-views-nav";
import { PageHeader } from "@/components/saas/page-header";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import {
  countAllCases,
  countRunningCases,
  getRunningInsights,
  listLegalCategories,
  listLegalViewCases,
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
  searchParams: Promise<{ category?: string; page?: string }>;
};

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
  const { category, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);
  const admin = isLegalAdmin(user);

  const [casePage, categories, counts, runningInsights] = await Promise.all([
    listLegalViewCases(user, viewKey, { category, page }),
    listLegalCategories(user),
    Promise.all([countAllCases(user), countRunningCases(user)]).then(
      ([all, running]) => ({ all, running }),
    ),
    viewKey === "running" ? getRunningInsights(user) : Promise.resolve(null),
  ]);

  const columns = legalViewColumns(viewKey);
  const listQuery = new URLSearchParams();
  if (category) listQuery.set("category", category);

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
        {view.categoryFilter ? (
          <Suspense fallback={null}>
            <LegalCategoryFilter categories={categories} current={category} />
          </Suspense>
        ) : null}

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
