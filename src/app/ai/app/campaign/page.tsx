import { PageHeader } from "@/components/saas/page-header";
import { CampaignRelatedSetup } from "@/components/saas/campaign-related-setup";
import { WhatsAppGoLivePanel } from "@/components/saas/whatsapp-go-live-panel";
import { getWhatsAppPageSetup } from "@/app/app/whatsapp/actions";
import { requireSession } from "@/lib/require-session";
import { getCampaignRelatedSetup } from "@/lib/ai-module-data";
import { getWhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";

export default async function SheetomaticAiCampaignPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const [setup, goLiveStatus, relatedSetup] = await Promise.all([
    getWhatsAppPageSetup(user.organizationId),
    getWhatsAppGoLiveStatus(user.organizationId),
    getCampaignRelatedSetup(user.organizationId),
  ]);

  return (
    <div className="saas-page ws-wa-page-shell">
      <PageHeader
        title="Campaign"
        description="WhatsApp integration and Go Live — connect RedLava, verify webhook, and turn on customer AI."
      />

      {setup.setupHint ? (
        <div className="saas-form-message error ws-wa-config-banner">
          {setup.setupHint}
        </div>
      ) : null}

      <WhatsAppGoLivePanel status={goLiveStatus} />

      <CampaignRelatedSetup data={relatedSetup} />
    </div>
  );
}
