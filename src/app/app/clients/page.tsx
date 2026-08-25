import { redirect } from "next/navigation";
import { ClientsBillingDashboard } from "@/components/saas/clients-billing-dashboard";
import "@/components/saas/client-billing.css";
import { listWhatsAppApiClients } from "@/lib/billing/whatsapp-api-clients";
import { whatsAppApiPlanOptions } from "@/lib/billing/whatsapp-api-plans";
import {
  listMonthlyServiceAssignees,
  listMonthlyServiceClients,
  listMonthlyServiceLeadOptions,
} from "@/lib/billing/monthly-service-clients";
import { listClientBillingRows } from "@/lib/billing/queries";
import { ensureOnboardingTasks } from "@/lib/billing/invoices";
import { canManageSuperAdmins } from "@/lib/platform";
import { requireSession } from "@/lib/require-session";

export default async function ClientsBillingPage() {
  const user = await requireSession();
  if (!canManageSuperAdmins(user, user.organizationSlug)) {
    redirect("/app/billing");
  }

  const [rows, whatsappApiClients, monthlyServiceClients, monthlyServiceLeads, monthlyServiceAssignees] =
    await Promise.all([
      listClientBillingRows(),
      listWhatsAppApiClients(),
      listMonthlyServiceClients(user.organizationId),
      listMonthlyServiceLeadOptions(user.organizationId),
      listMonthlyServiceAssignees(user.organizationId),
    ]);
  await Promise.all(rows.map((row) => ensureOnboardingTasks(row.id)));

  return (
    <ClientsBillingDashboard
      rows={rows}
      whatsappApiClients={whatsappApiClients}
      whatsappApiPlans={whatsAppApiPlanOptions()}
      monthlyServiceClients={monthlyServiceClients}
      monthlyServiceLeads={monthlyServiceLeads}
      monthlyServiceAssignees={monthlyServiceAssignees}
    />
  );
}
