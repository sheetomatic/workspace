import Link from "next/link";
import { ApprovalsList } from "@/components/saas/approvals-list";
import { CourseEnrollmentsPanel } from "@/components/saas/course-enrollments-panel";
import { PageHeader } from "@/components/saas/page-header";
import { SignupApprovalsPanel } from "@/components/saas/signup-approvals-panel";
import { TemplateOrdersPanel } from "@/components/saas/template-orders-panel";
import { listPendingCourseEnrollments } from "@/lib/courses/enrollment";
import { requireSession } from "@/lib/require-session";
import { syncApprovalsFromGoogleSheets } from "@/lib/integrations/sync-sheets-to-db";
import { listPendingWorkspaceSignups } from "@/lib/pending-workspace-signups";
import {
  listAllTemplateProducts,
  listTemplateOrders,
} from "@/lib/templates/store";
import { listWorkspaceApprovals } from "@/lib/workspace-data";

export default async function ApprovalsPage() {
  const user = await requireSession("MANAGER", { module: "APPROVALS" });

  const [pendingSignups, courseEnrollments, templateOrders, templateProducts, sheetApprovals] =
    await Promise.all([
      user.isSuperAdmin ? listPendingWorkspaceSignups() : Promise.resolve([]),
      user.isSuperAdmin ? listPendingCourseEnrollments() : Promise.resolve([]),
      user.isSuperAdmin ? listTemplateOrders("PENDING") : Promise.resolve([]),
      user.isSuperAdmin ? listAllTemplateProducts() : Promise.resolve([]),
      (async () => {
        try {
          await syncApprovalsFromGoogleSheets(user.organizationId);
        } catch {
          // Use database approvals when Sheets is unavailable
        }
        return listWorkspaceApprovals(user);
      })(),
    ]);

  return (
    <div className="saas-page ws-tasks-sf">
      <PageHeader
        title="Approvals"
        description={
          user.isSuperAdmin
            ? "Approve workspace signups, confirm 1:1 course and template payments, and review operational items before they go into MIS."
            : "Review items synced from your Approvals sheet tab before they go into MIS."
        }
      />

      {user.isSuperAdmin ? (
        <>
          <SignupApprovalsPanel workspaces={pendingSignups} />
          <CourseEnrollmentsPanel
            enrollments={courseEnrollments.map((row) => ({
              id: row.id,
              name: row.name,
              phone: row.phone,
              email: row.email,
              amountInr: row.amountInr,
              cohort: row.cohort,
              status: row.status,
              createdAt: row.createdAt.toISOString(),
              bookingToken: row.bookingToken,
            }))}
          />
          <div style={{ marginBottom: "0.75rem" }}>
            <Link href="/app/template-orders" className="saas-btn">
              Open full template store admin
            </Link>
          </div>
          <TemplateOrdersPanel
            orders={templateOrders.map((row) => ({
              id: row.id,
              customerName: row.customerName,
              customerEmail: row.customerEmail,
              customerPhone: row.customerPhone,
              paymentRef: row.paymentRef,
              status: row.status,
              createdAt: row.createdAt.toISOString(),
              product: {
                name: row.product.name,
                type: row.product.type,
                priceInr: row.product.priceInr,
                hasCopyLink: Boolean(row.product.copyLink?.trim()),
              },
            }))}
            products={templateProducts.map((row) => ({
              id: row.id,
              slug: row.slug,
              name: row.name,
              type: row.type,
              priceInr: row.priceInr,
              description: row.description,
              copyLink: row.copyLink,
              active: row.active,
              sortOrder: row.sortOrder,
            }))}
          />
        </>
      ) : null}

      <section className="ws-sf-list-view" aria-label="Operational approvals">
        <header className="ws-sf-list-view-header">
          <div className="ws-sf-list-view-title">
            <h2>Operational approvals</h2>
            <span className="ws-sf-list-view-count">{sheetApprovals.length}</span>
          </div>
        </header>

        {sheetApprovals.length === 0 ? (
          <div className="ws-empty-state">
            <p>No pending operational approvals for your role.</p>
          </div>
        ) : (
          <ApprovalsList items={sheetApprovals} />
        )}
      </section>
    </div>
  );
}
