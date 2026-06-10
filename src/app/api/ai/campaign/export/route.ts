import { NextResponse } from "next/server";
import {
  campaignDetailsToCsv,
  campaignMessagesToCsv,
} from "@/lib/campaign-export";
import {
  listRedlavaCampaignDetails,
  listRedlavaCampaignMessages,
} from "@/lib/integrations/redlava-campaigns";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { AI_APP_MIN_ROLE } from "@/lib/ai-auth-links";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

const PAGE_SIZE = 200;

async function fetchAllCampaignDetails(
  fileUploadId: string,
  credentials: { apiKey: string; phoneId: string | null },
) {
  const rows = [];
  let page = 1;
  let total = 0;

  do {
    const result = await listRedlavaCampaignDetails(fileUploadId, credentials, {
      current: page,
      pageSize: PAGE_SIZE,
    });
    if (!result.ok) {
      return result;
    }
    rows.push(...result.rows);
    total = result.total;
    page += 1;
  } while (rows.length < total);

  return { ok: true as const, rows };
}

async function fetchAllCampaignMessages(
  campaignId: string,
  credentials: { apiKey: string; phoneId: string | null },
) {
  const rows = [];
  let page = 1;
  let total = 0;

  do {
    const result = await listRedlavaCampaignMessages(campaignId, credentials, {
      current: page,
      pageSize: PAGE_SIZE,
    });
    if (!result.ok) {
      return result;
    }
    rows.push(...result.rows);
    total = result.total;
    page += 1;
  } while (rows.length < total);

  return { ok: true as const, rows };
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, AI_APP_MIN_ROLE)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  if (!credentials.redlavaApiKey) {
    return NextResponse.json({ error: "WhatsApp is not connected." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") === "messages" ? "messages" : "campaign";
  const campaignId = searchParams.get("campaignId")?.trim() ?? "";
  const fileUploadId = searchParams.get("fileUploadId")?.trim() ?? "";
  const campaignName = searchParams.get("name")?.trim() || "campaign";

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required." }, { status: 400 });
  }

  const redlavaCreds = {
    apiKey: credentials.redlavaApiKey,
    phoneId: credentials.redlavaPhoneId,
  };

  const safeName = campaignName.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);

  if (tab === "messages") {
    const result = await fetchAllCampaignMessages(campaignId, redlavaCreds);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Could not export message report." },
        { status: 502 },
      );
    }
    const csv = campaignMessagesToCsv(result.rows);
    const filename = `${safeName}-messages-${date}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (!fileUploadId) {
    return NextResponse.json({ error: "fileUploadId is required." }, { status: 400 });
  }

  const result = await fetchAllCampaignDetails(fileUploadId, redlavaCreds);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Could not export campaign rows." },
      { status: 502 },
    );
  }

  const csv = campaignDetailsToCsv(result.rows);
  const filename = `${safeName}-campaign-${date}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
