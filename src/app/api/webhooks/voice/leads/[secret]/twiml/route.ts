import { NextResponse } from "next/server";
import { parseVoiceLeadConfig } from "@/lib/leads/connection-config";
import { findLeadConnectionByWebhookSecret } from "@/lib/leads/webhook-secret";
import {
  buildTwilioTwiml,
} from "@/lib/leads/voice-receptionist";
import { voiceLeadWebhookUrl } from "@/lib/leads/connection-config";

type RouteContext = {
  params: Promise<{ secret: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  return POST(_request, context);
}

export async function POST(request: Request, context: RouteContext) {
  const { secret } = await context.params;
  if (!secret?.trim()) {
    return new NextResponse("Not found", { status: 404 });
  }
  const connection = await findLeadConnectionByWebhookSecret({
    channel: "VOICE",
    secret,
  });
  if (!connection) {
    return new NextResponse("Not found", { status: 404 });
  }
  const config = parseVoiceLeadConfig(connection.config);
  const url = new URL(request.url);
  const leadId = url.searchParams.get("leadId");
  const webhookUrl = leadId
    ? `${voiceLeadWebhookUrl(secret)}?leadId=${encodeURIComponent(leadId)}`
    : voiceLeadWebhookUrl(secret);
  const xml = buildTwilioTwiml({
    clinicName: config?.clinicName || "the clinic",
    webhookUrl,
  });
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}
