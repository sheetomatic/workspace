import { NextResponse } from "next/server";
import type { InboundLeadStatus, Prisma } from "@prisma/client";
import { verifyLeadIngestRequest } from "@/lib/leads/api-auth";
import { parseLeadSourceChannel } from "@/lib/leads/channels";
import { ingestInboundLead } from "@/lib/leads/ingest";
import { LEAD_STATUS_ORDER } from "@/lib/leads/status-labels";

type IngestBody = {
  channel?: string;
  externalId?: string;
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  requirement?: string;
  sourceDetail?: string;
  status?: InboundLeadStatus;
  assignedToId?: string;
  nextFollowUpAt?: string;
  createFmsJob?: boolean;
  raw?: Record<string, unknown>;
};

const ALLOWED_STATUSES = LEAD_STATUS_ORDER;

export async function POST(request: Request) {
  const auth = await verifyLeadIngestRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: IngestBody;
  try {
    body = (await request.json()) as IngestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channel = parseLeadSourceChannel(body.channel ?? "API");
  if (!channel) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const status =
    body.status && ALLOWED_STATUSES.includes(body.status) ? body.status : undefined;

  const result = await ingestInboundLead({
    organizationId: auth.organizationId,
    channel,
    externalId: body.externalId,
    name: body.name,
    phone: body.phone,
    email: body.email,
    city: body.city,
    requirement: body.requirement,
    sourceDetail: body.sourceDetail,
    status,
    assignedToId: body.assignedToId,
    nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : undefined,
    rawPayload: body.raw as Prisma.InputJsonValue | undefined,
    createFmsJob: body.createFmsJob,
  });

  return NextResponse.json({
    ok: true,
    leadId: result.lead.id,
    created: result.created,
    fmsInstanceId:
      result.fmsBridge && result.fmsBridge.ok ? result.fmsBridge.instanceId : null,
    fmsBridgeSkipped:
      result.fmsBridge && result.fmsBridge.ok ? result.fmsBridge.skipped : false,
    fmsBridgeError:
      result.fmsBridge && !result.fmsBridge.ok ? result.fmsBridge.reason : null,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Sheetomatic Leads Machine ingest endpoint",
    usage: {
      method: "POST",
      headers: {
        Authorization: "Bearer <your-leads-api-key>",
        "Content-Type": "application/json",
      },
      body: {
        channel: "FACEBOOK | INSTAGRAM | GOOGLE_SHEETS | WHATSAPP | API",
        externalId: "unique-id-from-source",
        name: "Lead name",
        phone: "919876543210",
        requirement: "What they want",
        sourceDetail: "Campaign or form name",
        createFmsJob: true,
      },
    },
  });
}
