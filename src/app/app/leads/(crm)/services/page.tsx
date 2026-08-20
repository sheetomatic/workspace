import { ServiceMasterPanel } from "@/components/saas/service-master-panel";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import {
  listLeadServiceCatalog,
  serializeServiceCatalogItem,
} from "@/lib/leads/service-catalog";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

export default async function CrmServiceMasterPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "services");
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const rows = await listLeadServiceCatalog(user.organizationId, {
    includeInactive: true,
  });
  const items = rows.map(serializeServiceCatalogItem);
  const activeCount = items.filter((item) => item.isActive).length;

  return (
    <CrmSubmoduleShell
      title="Service Master"
      description="Standard services for quotations. Add, edit, hide, or remove — quotes only show active rows."
      kpis={[
        { label: "Active", value: String(activeCount), accent: "success" },
        { label: "Hidden", value: String(items.length - activeCount) },
        { label: "Total", value: String(items.length), accent: "blue" },
      ]}
    >
      <ServiceMasterPanel items={items} canManage={canManage} />
    </CrmSubmoduleShell>
  );
}
