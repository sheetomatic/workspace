import { notFound } from "next/navigation";
import { CrmCampaignDetail } from "@/components/saas/crm-campaign-detail";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import {
  getWaCampaign,
  listApprovedCampaignTemplates,
  listCampaignLeadCategories,
} from "@/lib/crm/wa-campaigns";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

export default async function CrmCampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "campaigns");
  const { campaignId } = await params;
  const campaign = await getWaCampaign(user.organizationId, campaignId);
  if (!campaign) {
    notFound();
  }

  const templatesResult = await listApprovedCampaignTemplates(user.organizationId);
  const categories = await listCampaignLeadCategories(user.organizationId);
  const canSend = hasMinimumRole(user.role, "MANAGER");

  return (
    <CrmSubmoduleShell
      title={campaign.name}
      description="Pick Approached — not converted (or another CRM category), map {{1}} {{2}} {{3}}, then send."
      leadsHref="/app/leads/campaigns"
      kpis={[
        { label: "Pending", value: String(campaign.counts.pending) },
        { label: "Sent", value: String(campaign.counts.sent), accent: "success" },
        {
          label: "Failed",
          value: String(campaign.counts.failed),
          accent: campaign.counts.failed > 0 ? "danger" : undefined,
        },
      ]}
    >
      <CrmCampaignDetail
        canSend={canSend}
        categories={categories}
        campaign={{
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          templateName: campaign.templateName,
          templateLanguage: campaign.templateLanguage,
          templateCategory: campaign.templateCategory,
          pauseReason: campaign.pauseReason,
          variableMap: campaign.variableMap,
          counts: campaign.counts,
          recipients: campaign.recipients.map((row) => ({
            id: row.id,
            name: row.name,
            phone: row.phone,
            status: row.status,
            error: row.error,
            errorCode: row.errorCode,
          })),
        }}
        initialTemplates={templatesResult.templates}
        templatesError={templatesResult.ok ? null : templatesResult.error ?? null}
      />
    </CrmSubmoduleShell>
  );
}
