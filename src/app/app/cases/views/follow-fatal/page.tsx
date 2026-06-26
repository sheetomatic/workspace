import Link from "next/link";
import { Suspense } from "react";
import { FollowFatalFilters, FollowFatalTable } from "@/components/legal/follow-fatal-table";
import {
  LegalCaseCreatePanel,
  LegalCasesPageActions,
} from "@/components/legal/legal-cases-action-bar";
import { LegalViewsNav } from "@/components/legal/legal-views-nav";
import { PageHeader } from "@/components/saas/page-header";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { buildFollowFatalList } from "@/lib/legal-cases/follow-fatal";
import { doaMonthKey } from "@/lib/legal-cases/intake-fields";
import { getLegalViewNavCounts } from "@/lib/legal-cases/view-queries";
import { requireSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";

type PageProps = {
  searchParams: Promise<{ month?: string; hideExcluded?: string }>;
};

export default async function FollowFatalPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "CASES" });
  const params = await searchParams;
  const admin = isLegalAdmin(user);
  const month =
    params.month ??
    doaMonthKey(new Date().toLocaleDateString("en-GB")) ??
    new Date().toISOString().slice(0, 7);
  const hideExcluded = params.hideExcluded === "1";

  const [result, counts] = await Promise.all([
    buildFollowFatalList(user, { month, hideExcluded }),
    getLegalViewNavCounts(user),
  ]);

  return (
    <div className="saas-page legal-list-page">
      <div className="legal-list-toolbar">
        <div className="legal-list-toolbar-main">
          <Link className="legal-back-link" href="/app/cases">
            &larr; Dashboard
          </Link>
          <PageHeader
            description={`${result.total.toLocaleString()} entries for ${result.monthLabel}. Excluded categories: ${result.excludedCount}. Matches the Follow Fatal FIR monthly sheet from voice note 1.`}
            title="Follow Fatal FIR"
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
        <FollowFatalFilters hideExcluded={hideExcluded} month={month} />
        <FollowFatalTable rows={result.rows} />
      </section>
    </div>
  );
}
