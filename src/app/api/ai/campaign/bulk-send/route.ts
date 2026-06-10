import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { AI_APP_MIN_ROLE } from "@/lib/ai-auth-links";
import {
  sendRedlavaBulkCsvCampaign,
  type BulkCsvCampaignPayload,
} from "@/lib/integrations/redlava-bulk-send";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, AI_APP_MIN_ROLE)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  if (!credentials.redlavaApiKey || !credentials.redlavaPhoneId) {
    return NextResponse.json(
      { error: "WhatsApp is not connected. Add RedLava API key and Phone ID in Settings." },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const jsonRaw = form.get("jsonData");
  const csvFile = form.get("csvFile");

  if (typeof jsonRaw !== "string" || !jsonRaw.trim()) {
    return NextResponse.json({ error: "Campaign payload is required." }, { status: 400 });
  }

  if (!(csvFile instanceof File) || csvFile.size === 0) {
    return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
  }

  if (!csvFile.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Upload a .csv file." }, { status: 400 });
  }

  let payload: BulkCsvCampaignPayload;
  try {
    payload = JSON.parse(jsonRaw) as BulkCsvCampaignPayload;
  } catch {
    return NextResponse.json({ error: "Campaign payload was not valid JSON." }, { status: 400 });
  }

  if (!payload.campaignName?.trim()) {
    return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
  }

  if (!payload.message?.templateName?.trim() || !payload.message?.language?.trim()) {
    return NextResponse.json({ error: "Select an approved template." }, { status: 400 });
  }

  const result = await sendRedlavaBulkCsvCampaign(
    {
      campaignType: "CSV",
      campaignName: payload.campaignName.trim(),
      message: {
        templateName: payload.message.templateName.trim(),
        language: payload.message.language.trim(),
      },
      ...(payload.schedule ? { schedule: payload.schedule } : {}),
      ...(payload.dripId ? { dripId: payload.dripId } : {}),
    },
    csvFile,
    csvFile.name,
    {
      apiKey: credentials.redlavaApiKey,
      phoneId: credentials.redlavaPhoneId,
    },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    campaignId: result.campaign.id,
    campaignName: result.campaign.name,
  });
}
