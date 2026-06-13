import { isEmailConfigured } from "@/lib/integrations/email";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { isWhatsAppProviderConfigured } from "@/lib/integrations/whatsapp-provider";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export type WorkspaceIntegrationStatus = {
  emailConfigured: boolean;
  whatsappConfigured: boolean;
  openaiConfigured: boolean;
  whatsappProvider: "sheetomatic" | "messageautosender";
};

export async function getWorkspaceIntegrationStatus(
  organizationId: string,
): Promise<WorkspaceIntegrationStatus> {
  const credentials = await resolveWorkspaceWhatsAppCredentials(organizationId);
  const platform = getIntegrationStatus();
  return {
    emailConfigured: isEmailConfigured(),
    whatsappConfigured: isWhatsAppProviderConfigured(credentials),
    openaiConfigured: platform.openai,
    whatsappProvider: credentials.whatsappProvider,
  };
}
