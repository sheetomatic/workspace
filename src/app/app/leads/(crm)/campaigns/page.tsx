import { CrmCampaignsList } from "@/components/saas/crm-campaigns-list";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { listWaCampaigns } from "@/lib/crm/wa-campaigns";
import { requireSession } from "@/lib/require-session";

export default async function CrmCampaignsPage() {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "campaigns");
  const campaigns = await listWaCampaigns(user.organizationId);
  const pending = campaigns.reduce((sum, row) => sum + row.counts.pending, 0);
  const sent = campaigns.reduce((sum, row) => sum + row.counts.sent, 0);
  const failed = campaigns.reduce((sum, row) => sum + row.counts.failed, 0);

  return (
    <CrmSubmoduleShell
      title="Campaigns"
      description="Add a CRM category as the audience — default is Approached — not converted. Pick an approved Official API template and send in batches."
      leadsHref="/app/leads"
      kpis={[
        { label: "Campaigns", value: String(campaigns.length), accent: "blue" },
        { label: "Pending", value: String(pending) },
        { label: "Sent", value: String(sent), accent: "success" },
        { label: "Failed", value: String(failed), accent: failed > 0 ? "danger" : undefined },
      ]}
    >
      <CrmCampaignsList campaigns={campaigns} />
    </CrmSubmoduleShell>
  );
}
