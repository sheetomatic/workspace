import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { WhatsAppGoLivePanel } from "@/components/saas/whatsapp-go-live-panel";
import { getWhatsAppPageSetup } from "@/app/app/whatsapp/actions";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import {
  listWhatsAppMembers,
  resolveWorkspaceWhatsAppCredentials,
} from "@/lib/whatsapp-settings";
import { getWhatsAppGoLiveStatus } from "@/lib/whatsapp-go-live";

export default async function SheetomaticAiCampaignPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const [members, credentials, setup, goLiveStatus] = await Promise.all([
    listWhatsAppMembers(user.organizationId),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
    getWhatsAppPageSetup(user.organizationId),
    getWhatsAppGoLiveStatus(user.organizationId),
  ]);

  const managerCount = members.filter(
    (member) => member.phone && hasMinimumRole(member.role, "MANAGER"),
  ).length;

  return (
    <div className="saas-page ws-wa-page-shell">
      <PageHeader
        title="Campaign"
        description="Connect your WhatsApp Business API number and go live with Sheetomatic AI."
      />

      {setup.setupHint ? (
        <div className="saas-form-message error ws-wa-config-banner">
          {setup.setupHint}
        </div>
      ) : null}

      <WhatsAppGoLivePanel status={goLiveStatus} />

      <section className="saas-panel ws-go-live-links">
        <h3>Related setup</h3>
        <ul>
          <li>
            <Link href="/ai/app/settings">Settings</Link> - RedLava API key, Phone ID,
            team WhatsApp numbers ({managerCount} manager numbers on file)
          </li>
          <li>
            <Link href="/ai/app/templates">Templates</Link> - Submit and sync approved
            WhatsApp templates
          </li>
          <li>
            <Link href="/ai/app/inbox">Chats</Link> - Live team inbox after Go Live
          </li>
        </ul>
        <p className="ws-go-live-hint">
          Connected via {setup.canSend ? "RedLava" : "not configured"}. Source:{" "}
          {credentials.source}
        </p>
      </section>
    </div>
  );
}
