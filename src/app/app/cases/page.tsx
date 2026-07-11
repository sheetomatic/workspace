import { LegalDashboard } from "@/components/legal/legal-dashboard";
import {
  LegalCaseCreatePanel,
  LegalCasesPageActions,
} from "@/components/legal/legal-cases-action-bar";
import { LegalRunningInsights } from "@/components/legal/legal-running-insights";
import { LegalViewsNavLoader } from "@/components/legal/legal-views-nav-loader";
import { PageHeader } from "@/components/saas/page-header";
import { getDedicatedClientPortal } from "@/lib/dedicated-client-portals";
import { isLegalAdmin } from "@/lib/legal-cases/access";
import { getLegalDashboardStats } from "@/lib/legal-cases/queries";
import {
  getRunningInsights,
} from "@/lib/legal-cases/view-queries";
import { requireLegalCasesSession } from "@/lib/require-session";
import "@/components/legal/legal-cases.css";
import { Suspense } from "react";
import type { SessionUser } from "@/lib/auth";

async function CasesDashboardBody({
  user,
  admin,
}: {
  user: SessionUser;
  admin: boolean;
}) {
  const [stats, runningInsights] = await Promise.all([
    getLegalDashboardStats(user),
    admin ? getRunningInsights(user) : Promise.resolve(null),
  ]);

  return (
    <>
      {runningInsights ? <LegalRunningInsights insights={runningInsights} /> : null}
      <LegalDashboard stats={stats} user={user} />
    </>
  );
}

export default async function CasesPage() {
  const user = await requireLegalCasesSession();
  const dedicatedPortal = getDedicatedClientPortal(user.organizationSlug);
  const admin = isLegalAdmin(user);
  const pageTitle = dedicatedPortal
    ? admin
      ? "Case command center"
      : "My cases"
    : admin
      ? "Cases dashboard"
      : "My work";

  return (
    <div className="saas-page">
      <div className="legal-page-toolbar">
        <div className="legal-list-toolbar-main">
          <PageHeader
            description={
              admin
                ? dedicatedPortal
                  ? "Track MACT case files, hearings, and documents in one dedicated portal."
                  : "Manage all MACT case files, hearings, and documents."
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

      <LegalCaseCreatePanel canCreate={admin} />

      <Suspense
        fallback={
          <div
            className="legal-panel"
            aria-busy="true"
            style={{ minHeight: 200, background: "#f8fafc", borderRadius: 12 }}
          >
            Loading dashboard…
          </div>
        }
      >
        <CasesDashboardBody admin={admin} user={user} />
      </Suspense>
    </div>
  );
}
