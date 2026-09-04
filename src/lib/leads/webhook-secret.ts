import type { LeadSourceChannel } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  asConfigRecord,
  generateLeadWebhookSecret,
  hashLeadWebhookSecret,
  readString,
} from "@/lib/leads/connection-config";

export async function findLeadConnectionByWebhookSecret(params: {
  channel: LeadSourceChannel;
  secret: string;
}) {
  const trimmed = params.secret.trim();
  if (!trimmed) return null;
  const hash = hashLeadWebhookSecret(trimmed);

  const byHash = await prisma.leadIngestConnection.findFirst({
    where: {
      channel: params.channel,
      enabled: true,
      ingestSecretHash: hash,
    },
  });
  if (byHash) return byHash;

  const rows = await prisma.leadIngestConnection.findMany({
    where: {
      channel: params.channel,
      enabled: true,
      ingestSecretHash: null,
    },
  });
  return (
    rows.find((row) => readString(asConfigRecord(row.config), "webhookSecret") === trimmed) ??
    null
  );
}

export function ensureLeadWebhookSecret(existing: unknown, prefix: string) {
  const current = readString(asConfigRecord(existing), "webhookSecret");
  if (current) {
    return {
      secret: current,
      hash: hashLeadWebhookSecret(current),
      reuse: true as const,
    };
  }
  const generated = generateLeadWebhookSecret(prefix);
  return { secret: generated.secret, hash: generated.hash, reuse: false as const };
}
