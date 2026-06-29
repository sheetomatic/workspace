import { LeadsSettingsPanel } from "@/components/saas/leads-settings-panel";
import {
  getGoogleSheetsServiceAccountEmail,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { listLeadConnections } from "@/lib/leads/queries";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function LeadsSettingsPage() {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    redirect("/app/leads");
  }

  await ensureLeadConnections(user.organizationId);

  const [connections, org] = await Promise.all([
    listLeadConnections(user.organizationId),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { leadMachineApiKeyHint: true },
    }),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com";

  return (
    <LeadsSettingsPanel
      apiKeyHint={org?.leadMachineApiKeyHint ?? null}
      connections={connections}
      ingestUrl={`${siteUrl}/api/leads/ingest`}
      serviceAccountEmail={getGoogleSheetsServiceAccountEmail()}
      sheetsAuthConfigured={isGoogleSheetsAuthConfigured()}
    />
  );
}
