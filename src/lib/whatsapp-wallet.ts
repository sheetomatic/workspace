import {
  getRedlavaAiWallet,
  getRedlavaWaWallet,
  type RedlavaCredentials,
  type RedlavaTenantWallet,
} from "@/lib/integrations/redlava";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export type WorkspaceTenantWallets = {
  ok: true;
  wa: RedlavaTenantWallet;
  ai: RedlavaTenantWallet;
  pendingTotal: number;
} | {
  ok: false;
  error: string;
};

function toCredentials(
  credentials: Awaited<ReturnType<typeof resolveWorkspaceWhatsAppCredentials>>,
): RedlavaCredentials | null {
  if (!credentials.redlavaApiKey) {
    return null;
  }

  return {
    apiKey: credentials.redlavaApiKey,
    phoneId: credentials.redlavaPhoneId,
  };
}

export async function getWorkspaceTenantWallets(
  organizationId: string,
): Promise<WorkspaceTenantWallets | null> {
  const credentials = await resolveWorkspaceWhatsAppCredentials(organizationId);
  const redlava = toCredentials(credentials);
  if (!redlava) {
    return null;
  }

  const [wa, ai] = await Promise.all([
    getRedlavaWaWallet(redlava),
    getRedlavaAiWallet(redlava),
  ]);

  if (!wa.ok) {
    return { ok: false, error: wa.error ?? "Could not load WhatsApp wallet." };
  }
  if (!ai.ok) {
    return { ok: false, error: ai.error ?? "Could not load AI wallet." };
  }

  return {
    ok: true,
    wa: wa.wallet,
    ai: ai.wallet,
    pendingTotal: wa.wallet.pendingBalance + ai.wallet.pendingBalance,
  };
}
