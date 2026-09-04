import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pullIndiaMartLeads } from "@/lib/leads/indiamart";
import { pullShopifyLeads } from "@/lib/leads/shopify";
import { pullTradeIndiaLeads } from "@/lib/leads/tradeindia";
import { pullWooCommerceLeads } from "@/lib/leads/woocommerce";
import type { LeadSourceChannel } from "@prisma/client";

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

const MARKETPLACE_CHANNELS: LeadSourceChannel[] = [
  "INDIAMART",
  "TRADEINDIA",
  "SHOPIFY",
  "WOOCOMMERCE",
];

export const maxDuration = 120;

/** Pull marketplace / store leads for every org with those connectors enabled. */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.leadIngestConnection.findMany({
    where: { enabled: true, channel: { in: MARKETPLACE_CHANNELS } },
    select: { organizationId: true, channel: true },
  });

  const results = [];
  for (const row of connections) {
    let synced;
    if (row.channel === "INDIAMART") {
      synced = await pullIndiaMartLeads({ organizationId: row.organizationId });
    } else if (row.channel === "TRADEINDIA") {
      synced = await pullTradeIndiaLeads({ organizationId: row.organizationId });
    } else if (row.channel === "SHOPIFY") {
      synced = await pullShopifyLeads({ organizationId: row.organizationId });
    } else {
      synced = await pullWooCommerceLeads({ organizationId: row.organizationId });
    }
    results.push({
      organizationId: row.organizationId,
      channel: row.channel,
      synced,
    });
  }

  return NextResponse.json({ ok: true, results });
}
