import { PageHeader } from "@/components/saas/page-header";
import { WhatsAppTemplatesPanel } from "@/components/saas/whatsapp-templates-panel";
import { getWhatsAppPageSetup } from "@/app/app/whatsapp/actions";
import { requireSession } from "@/lib/require-session";
import { listOrganizationWhatsAppTemplates } from "@/lib/whatsapp-template-store";

export default async function SheetomaticAiTemplatesPage() {
  const user = await requireSession("ADMIN", { redirectTo: "/ai/app" });
  const [templates, setup] = await Promise.all([
    listOrganizationWhatsAppTemplates(user.organizationId),
    getWhatsAppPageSetup(user.organizationId),
  ]);

  const rows = templates.map((template) => ({
    ...template,
    variables: Array.isArray(template.variables)
      ? (template.variables as Array<{ name: string; example: string }>)
      : [],
  }));

  return (
    <div className="saas-page ws-wa-page-shell">
      <PageHeader
        title="Templates"
        description="Submit WhatsApp templates for Meta approval and manage approved message templates."
      />

      <WhatsAppTemplatesPanel
        canManageTemplates={setup.canManageTemplates}
        setupHint={setup.setupHint}
        templates={rows}
      />
    </div>
  );
}
