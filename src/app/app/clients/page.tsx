import { redirect } from "next/navigation";
import { ClientsBillingDashboard } from "@/components/saas/clients-billing-dashboard";
import "@/components/saas/client-billing.css";
import { listWhatsAppApiClients } from "@/lib/billing/whatsapp-api-clients";
import { whatsAppApiPlanOptions } from "@/lib/billing/whatsapp-api-plans";
import { listClientBillingRows } from "@/lib/billing/queries";
import { ensureOnboardingTasks } from "@/lib/billing/invoices";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";

export default async function ClientsBillingPage() {
  const user = await requireSession();
  if (!canManageSuperAdmins(user, user.organizationSlug)) {
    redirect("/app/billing");
  }

  const [rows, whatsappApiClients] = await Promise.all([
    listClientBillingRows(),
    listWhatsAppApiClients(),
  ]);
  await Promise.all(rows.map((row) => ensureOnboardingTasks(row.id)));

  return (
    <ClientsBillingDashboard
      rows={rows}
      whatsappApiClients={whatsappApiClients}
      whatsappApiPlans={whatsAppApiPlanOptions()}
    />
  );
}
