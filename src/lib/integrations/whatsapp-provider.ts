/**
 * Unified WhatsApp provider layer - Sheetomatic WhatsApp (Meta Cloud via RedLava)
 * and Message Auto Sender (WhatsApp Web automation).
 */

import {
  isRedlavaConfigured,
  sendRedlavaWhatsAppMessage,
  type RedlavaCredentials,
  type WhatsAppSendResult,
} from "@/lib/integrations/redlava";
import {
  isMasConfigured,
  sendMasWhatsAppMessage,
  type MasCredentials,
} from "@/lib/integrations/messageautosender";
import { normalizeWhatsAppPhone } from "@/lib/phone";
import {
  parseWhatsAppSendResponse,
  type ParseWhatsAppSendOptions,
} from "@/lib/integrations/redlava";
import {
  resolveWorkspaceWhatsAppCredentials,
  type WorkspaceWhatsAppCredentials,
} from "@/lib/whatsapp-settings";

export type WhatsAppProviderKind = "sheetomatic" | "messageautosender";

export type WhatsAppProviderCapabilities = {
  templates: boolean;
  interactive: boolean;
  campaigns: boolean;
  mediaDownload: boolean;
  metaWebhook: boolean;
  wallet: boolean;
};

const PROVIDER_CAPABILITIES: Record<WhatsAppProviderKind, WhatsAppProviderCapabilities> = {
  sheetomatic: {
    templates: true,
    interactive: true,
    campaigns: true,
    mediaDownload: true,
    metaWebhook: true,
    wallet: true,
  },
  messageautosender: {
    templates: false,
    interactive: false,
    campaigns: false,
    mediaDownload: false,
    metaWebhook: false,
    wallet: false,
  },
};

export function getWhatsAppProviderCapabilities(
  provider: WhatsAppProviderKind,
): WhatsAppProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider];
}

export function resolveWhatsAppProviderKind(
  credentials: Pick<WorkspaceWhatsAppCredentials, "whatsappProvider">,
): WhatsAppProviderKind {
  return credentials.whatsappProvider === "messageautosender"
    ? "messageautosender"
    : "sheetomatic";
}

/** Official Cloud / RedLava identity is present (independent of whatsappProvider). */
export function isOfficialWhatsAppConfigured(
  credentials: Pick<
    WorkspaceWhatsAppCredentials,
    "redlavaApiKey" | "redlavaPhoneId" | "metaAccessToken"
  >,
): boolean {
  const phoneId = credentials.redlavaPhoneId?.trim();
  if (!phoneId) {
    return false;
  }
  return (
    Boolean(credentials.redlavaApiKey?.trim()) ||
    Boolean(credentials.metaAccessToken?.trim())
  );
}

export function isWhatsAppProviderConfigured(
  credentials: WorkspaceWhatsAppCredentials,
): boolean {
  const provider = resolveWhatsAppProviderKind(credentials);
  if (provider === "messageautosender") {
    // Customer bot / Meta webhook still use Official when configured.
    if (isOfficialWhatsAppConfigured(credentials)) {
      return true;
    }
    return isMasConfigured({
      username: credentials.masUsername,
      password: credentials.masPassword,
      apiKey: credentials.masApiKey,
    });
  }

  return isOfficialWhatsAppConfigured(credentials);
}

/**
 * Prefer Official Cloud for customer-facing bot sends even if nurture MAS
 * credentials are also saved. Callers that must use MAS (nurture) should
 * call sendMas directly and never go through this helper.
 */
export function credentialsForCustomerBot(
  credentials: WorkspaceWhatsAppCredentials,
): WorkspaceWhatsAppCredentials {
  if (isOfficialWhatsAppConfigured(credentials)) {
    return { ...credentials, whatsappProvider: "sheetomatic" };
  }
  return credentials;
}

async function sendViaMetaCloud(params: {
  toPhone: string;
  payload: Record<string, unknown>;
  accessToken: string;
  phoneNumberId: string;
  options?: ParseWhatsAppSendOptions;
}): Promise<WhatsAppSendResult> {
  const to = normalizeWhatsAppPhone(params.toPhone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" };
  }

  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const response = await fetch(
    `https://graph.facebook.com/${version}/${params.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        ...params.payload,
      }),
    },
  );

  const raw = await response.text();
  const messageType =
    typeof params.payload.type === "string" ? params.payload.type : undefined;
  return parseWhatsAppSendResponse(response, raw, {
    messageType,
    ...params.options,
  });
}

export type DeliverWhatsAppMessageParams = {
  organizationId?: string;
  toPhone: string;
  message: Record<string, unknown>;
  credentials?: WorkspaceWhatsAppCredentials;
  templateLanguageCode?: string;
  /** When true (default), Official Cloud wins over MAS for customer replies. */
  preferOfficial?: boolean;
};

export async function deliverWhatsAppMessage(
  params: DeliverWhatsAppMessageParams,
): Promise<WhatsAppSendResult> {
  const rawCredentials =
    params.credentials ??
    (params.organizationId
      ? await resolveWorkspaceWhatsAppCredentials(params.organizationId)
      : null);

  if (!rawCredentials) {
    return { sent: false, reason: "not_configured" };
  }

  const preferOfficial = params.preferOfficial !== false;
  const credentials =
    preferOfficial ? credentialsForCustomerBot(rawCredentials) : rawCredentials;

  const provider = resolveWhatsAppProviderKind(credentials);
  const messageType =
    typeof params.message.type === "string" ? params.message.type : undefined;

  if (provider === "messageautosender") {
    return sendMasWhatsAppMessage(
      { toPhone: params.toPhone, message: params.message },
      {
        username: credentials.masUsername,
        password: credentials.masPassword,
        apiKey: credentials.masApiKey,
      },
    );
  }

  const redlavaCreds: RedlavaCredentials = {
    apiKey: credentials.redlavaApiKey,
    phoneId: credentials.redlavaPhoneId,
  };

  if (isRedlavaConfigured(redlavaCreds)) {
    const result = await sendRedlavaWhatsAppMessage(
      { toPhone: params.toPhone, message: params.message },
      redlavaCreds,
    );
    if (result.sent || result.reason === "phone_id_required") {
      return result;
    }
    if (result.reason !== "not_configured") {
      if (credentials.metaAccessToken && credentials.redlavaPhoneId) {
        return sendViaMetaCloud({
          toPhone: params.toPhone,
          payload: params.message,
          accessToken: credentials.metaAccessToken,
          phoneNumberId: credentials.redlavaPhoneId,
          options: {
            messageType,
            templateLanguageCode: params.templateLanguageCode,
          },
        });
      }
      return result;
    }
  }

  if (credentials.metaAccessToken && credentials.redlavaPhoneId) {
    return sendViaMetaCloud({
      toPhone: params.toPhone,
      payload: params.message,
      accessToken: credentials.metaAccessToken,
      phoneNumberId: credentials.redlavaPhoneId,
      options: {
        messageType,
        templateLanguageCode: params.templateLanguageCode,
      },
    });
  }

  return { sent: false, reason: "not_configured" };
}

export function sheetomaticCredentialsFromWorkspace(
  credentials: WorkspaceWhatsAppCredentials,
): {
  redlava: RedlavaCredentials | null;
  metaToken: string | null;
  metaPhoneId: string | null;
} {
  return {
    redlava: credentials.redlavaApiKey
      ? {
          apiKey: credentials.redlavaApiKey,
          phoneId: credentials.redlavaPhoneId,
        }
      : null,
    metaToken: credentials.metaAccessToken,
    metaPhoneId: credentials.redlavaPhoneId,
  };
}

export function masCredentialsFromWorkspace(
  credentials: WorkspaceWhatsAppCredentials,
): MasCredentials | null {
  if (!credentials.masUsername && !credentials.masPassword && !credentials.masApiKey) {
    return null;
  }
  return {
    username: credentials.masUsername,
    password: credentials.masPassword,
    apiKey: credentials.masApiKey,
  };
}
