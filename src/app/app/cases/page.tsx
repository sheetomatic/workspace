import { LegalDashboard } from "@/components/legal/legal-dashboard";
import {
  LegalCaseCreatePanel,
  LegalCasesPageActions,
} from "@/components/legal/legal-cases-action-bar";
import { LegalRunningInsights } from "@/components/legal/legal-running-insights";
import { LegalViewsNavLoader } from "@/components/legal/legal-views-nav-loader";
import { PageHeader } from "@/components/saas/page-header";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { getLegalDashboardStats } from "@/lib/legal-cases/queries";
import {
  getRunningInsights,
} from "@/lib/legal-cases/view-queries";
import { requireSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";
import { Suspense } from "react";

export default async function CasesPage() {
  const user = await requireSession(undefined, { module: "CASES" });
  const isHingorani = user.organizationSlug === "hingorani";
  const admin = isLegalAdmin(user);
  const pageTitle = isHingorani
    ? admin
      ? "Hingorani dashboard"
      : "My work"
    : admin
      ? "Cases dashboard"
      : "My work";

  let stats: Awaited<ReturnType<typeof getLegalDashboardStats>>;
  let runningInsights: Awaited<ReturnType<typeof getRunningInsights>> | null = null;

  try {
    [stats, runningInsights] = await Promise.all([
      getLegalDashboardStats(user),
      admin ? getRunningInsights(user) : Promise.resolve(null),
    ]);
  } catch (error) {
    console.error("[cases-page] dashboard load failed", error);
    throw error;
  }

  return (
    <div className="saas-page">
      <div className="legal-page-toolbar">
        <div className="legal-list-toolbar-main">
          <PageHeader
            description={
              admin
                ? "Manage all MACT case files, hearings, and documents."
                : `Your assigned cases${user.staffCode ? ` (${user.staffCode})` : ""}.`
            }
            title={pageTitle}
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

      <Suspense fallback={<div className="legal-views-nav-skeleton" aria-hidden />}>
        <LegalViewsNavLoader user={user} />
      </Suspense>

      {runningInsights ? <LegalRunningInsights insights={runningInsights} /> : null}

      <LegalCaseCreatePanel canCreate={admin} />

      <Suspense fallback={<div className="legal-panel">Loading dashboard...</div>}>
        <LegalDashboard stats={stats} user={user} />
      </Suspense>
    </div>
  );
}
