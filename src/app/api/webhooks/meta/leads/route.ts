import { after } from "next/server";
import { NextResponse } from "next/server";
import { parseMetaLeadAdsConfig } from "@/lib/leads/connection-config";
import {
  extractMetaLeadgenJobs,
  findMetaLeadConnectionByVerifyToken,
  findMetaLeadConnectionsByPageId,
  processMetaLeadgenEvent,
  verifyMetaLeadSignature,
} from "@/lib/leads/meta-lead-ads";

export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const connection = await findMetaLeadConnectionByVerifyToken(token);
  if (!connection) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const jobs = extractMetaLeadgenJobs(payload);
  if (!jobs.length) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const signature = request.headers.get("x-hub-signature-256");

  after(async () => {
    for (const job of jobs) {
      try {
        const connections = await findMetaLeadConnectionsByPageId(job.pageId);
        const appSecret = connections
          .map((row) => parseMetaLeadAdsConfig(row.config)?.appSecret)
          .find(Boolean);
        if (!verifyMetaLeadSignature(rawBody, signature, appSecret)) {
          console.warn("meta leads webhook: bad signature", job.pageId);
          continue;
        }
        await processMetaLeadgenEvent(job);
      } catch (error) {
        console.error("meta leads webhook", error);
      }
    }
  });

  return NextResponse.json({ ok: true, queued: true });
}
