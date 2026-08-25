import { redirect } from "next/navigation";
import { ClientsBillingDashboard } from "@/components/saas/clients-billing-dashboard";
import "@/components/saas/client-billing.css";
import { listClientBillingRows } from "@/lib/billing/queries";
import { ensureOnboardingTasks } from "@/lib/billing/invoices";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";

export default async function ClientsBillingPage() {
  const user = await requireSession();
  if (!canManageSuperAdmins(user, user.organizationSlug)) {
    redirect("/app/billing");
  }

  const rows = await listClientBillingRows();
  await Promise.all(rows.map((row) => ensureOnboardingTasks(row.id)));

  return <ClientsBillingDashboard rows={rows} />;
}
