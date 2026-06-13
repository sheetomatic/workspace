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
import { listRedlavaSendTemplates } from "@/lib/integrations/redlava-bulk-send";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export default async function SheetomaticAiCampaignPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const [setup, goLiveStatus, relatedSetup, credentials] = await Promise.all([
    getWhatsAppPageSetup(),
    getWhatsAppGoLiveStatus(user.organizationId),
    getCampaignRelatedSetup(user.organizationId),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
  ]);

  const connected = Boolean(credentials.redlavaApiKey && credentials.redlavaPhoneId);
  const redlavaCreds = {
    apiKey: credentials.redlavaApiKey,
    phoneId: credentials.redlavaPhoneId,
  };

  let campaigns: RedlavaCsvCampaign[] = [];
  let campaignError: string | null = null;
  let bulkSendTemplates: Awaited<
    ReturnType<typeof listRedlavaSendTemplates>
  >["templates"] = [];
  let bulkSendTemplatesError: string | null = null;

  if (connected) {
    const [campaignResult, templateResult] = await Promise.all([
      listRedlavaCsvCampaigns(redlavaCreds),
      listRedlavaSendTemplates(redlavaCreds),
    ]);

    if (campaignResult.ok) {
      campaigns = campaignResult.campaigns;
    } else {
      campaignError = campaignResult.error ?? "Could not load campaigns from RedLava.";
    }

    if (templateResult.ok) {
      bulkSendTemplates = templateResult.templates;
      if (bulkSendTemplates.length === 0) {
        bulkSendTemplatesError =
          "No sendable templates found. Sync approved templates in Templates.";
      }
    } else {
      bulkSendTemplatesError =
        templateResult.error ?? "Could not load templates from RedLava.";
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

      <CampaignBulkSendPanel
        connected={connected}
        initialTemplates={bulkSendTemplates}
        templatesError={bulkSendTemplatesError}
        setupHint={
          !connected
            ? setup.setupHint ??
              "Add your RedLava API key and Phone ID in Settings to send bulk campaigns."
            : null
        }
      />

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
