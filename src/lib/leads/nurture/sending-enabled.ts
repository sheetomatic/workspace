import { isMasConfigured } from "@/lib/integrations/messageautosender";
import { masCredentialsFromWorkspace } from "@/lib/integrations/whatsapp-provider";
import { getLeadNurtureConfig } from "@/lib/leads/nurture/config";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

/** Lead nurture sends when org has enabled nurture + saved Web Based API credentials. */
export async function isLeadNurtureSendingEnabled(
  organizationId: string,
): Promise<boolean> {
  const [config, credentials] = await Promise.all([
    getLeadNurtureConfig(organizationId),
    resolveWorkspaceWhatsAppCredentials(organizationId),
  ]);

  if (!config.enabled) {
    return false;
  }

  return isMasConfigured(masCredentialsFromWorkspace(credentials));
}
