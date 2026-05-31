import { downloadRedlavaWhatsAppMedia } from "@/lib/integrations/redlava";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

async function downloadViaMetaGraph(
  token: string,
  mediaId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const version = process.env.WHATSAPP_API_VERSION ?? "v21.0";
  const metaResponse = await fetch(
    `https://graph.facebook.com/${version}/${mediaId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!metaResponse.ok) {
    return null;
  }

  const meta = (await metaResponse.json()) as {
    url?: string;
    mime_type?: string;
  };

  if (!meta.url) {
    return null;
  }

  const fileResponse = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!fileResponse.ok) {
    return null;
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType:
      meta.mime_type ||
      fileResponse.headers.get("content-type") ||
      "audio/ogg",
  };
}

export async function downloadWhatsAppMedia(params: {
  organizationId: string;
  mediaId: string;
}): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const creds = await resolveWorkspaceWhatsAppCredentials(params.organizationId);

  if (creds.redlavaApiKey) {
    const fromRedlava = await downloadRedlavaWhatsAppMedia(params.mediaId, {
      apiKey: creds.redlavaApiKey,
      phoneId: creds.redlavaPhoneId,
    });
    if (fromRedlava) {
      return fromRedlava;
    }
  }

  const token =
    creds.metaAccessToken || process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "";
  if (token) {
    return downloadViaMetaGraph(token, params.mediaId);
  }

  return null;
}
