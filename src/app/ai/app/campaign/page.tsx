import { PageHeader } from "@/components/saas/page-header";
import { CampaignBulkSendPanel } from "@/components/saas/campaign-bulk-send-panel";
import { CampaignInsightsPanel } from "@/components/saas/campaign-insights-panel";
import { CampaignRelatedSetup } from "@/components/saas/campaign-related-setup";
import { WhatsAppGoLivePanel } from "@/components/saas/whatsapp-go-live-panel";
import { getWhatsAppPageSetup } from "@/app/app/whatsapp/actions";
import { requireSession } from "@/lib/require-session";
import { getCampaignRelatedSetup } from "@/lib/ai-module-data";
import { getWhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";
import { listRedlavaCsvCampaigns, type RedlavaCsvCampaign } from "@/lib/integrations/redlava-campaigns";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export default async function SheetomaticAiCampaignPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const [setup, goLiveStatus, relatedSetup, credentials] = await Promise.all([
    getWhatsAppPageSetup(user.organizationId),
    getWhatsAppGoLiveStatus(user.organizationId),
    getCampaignRelatedSetup(user.organizationId),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
  ]);

  const connected = Boolean(credentials.redlavaApiKey && credentials.redlavaPhoneId);

  let campaigns: RedlavaCsvCampaign[] = [];
  let campaignError: string | null = null;

  if (connected) {
    const result = await listRedlavaCsvCampaigns({
      apiKey: credentials.redlavaApiKey,
      phoneId: credentials.redlavaPhoneId,
    });
    if (result.ok) {
      campaigns = result.campaigns;
    } else {
      campaignError = result.error ?? "Could not load campaigns from RedLava.";
    }
  }

  return (
    <div className="saas-page ws-wa-page-shell">
      <PageHeader
        title="Campaign"
        description="Send bulk CSV campaigns, view delivery insights, and manage Go Live."
      />

      {setup.setupHint ? (
        <div className="saas-form-message error ws-wa-config-banner">
          {setup.setupHint}
        </div>
      ) : null}

      <CampaignBulkSendPanel connected={connected} />

      <CampaignInsightsPanel
        campaigns={campaigns}
        connected={connected}
        error={campaignError}
      />

      <WhatsAppGoLivePanel status={goLiveStatus} />

      <CampaignRelatedSetup data={relatedSetup} />
    </div>
  );
}
