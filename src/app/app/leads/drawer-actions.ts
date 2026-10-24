"use server";

import { requireCrmSubModule } from "@/lib/crm/crm-access";
import {
  serializeCrmDrawerLead,
  withCrmDrawerExtras,
} from "@/lib/leads/crm-lead-payload";
import { getInboundLeadForCrmDrawer } from "@/lib/leads/queries";
import { getAllSalesOrdersByLeadIds } from "@/lib/leads/sales-orders";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { mapPendingTemplateOrdersByLeadIds } from "@/lib/templates/store";
import { importSheetLeadsMatchingSearch } from "@/lib/leads/search-sheet";

export async function searchConnectedSheetAction(query: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "leads");
  const q = query.trim().slice(0, 160);
  if (q.length < 2) return { matched: 0, imported: 0 };
  return importSheetLeadsMatchingSearch({ organizationId: user.organizationId, q });
}

export async function getInboundLeadDrawerPayloadAction(leadId: string) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "leads");
  const canSeeAllLeads =
    user.isSuperAdmin || hasMinimumRole(user.role, "ADMIN");
  const leadScope = canSeeAllLeads ? undefined : { assignedToId: user.id };
  const lead = await getInboundLeadForCrmDrawer(
    user.organizationId,
    leadId,
    leadScope,
  );
  if (!lead) {
    return null;
  }

  const [salesOrdersByLead, pendingTemplateByLead] = await Promise.all([
    getAllSalesOrdersByLeadIds(user.organizationId, [lead.id]),
    mapPendingTemplateOrdersByLeadIds([lead.id]),
  ]);

  return withCrmDrawerExtras(
    serializeCrmDrawerLead(lead),
    salesOrdersByLead.get(lead.id) ?? [],
    pendingTemplateByLead.get(lead.id) ?? [],
  );
}
