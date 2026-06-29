import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export function hashLeadMachineApiKey(key: string) {
  return createHash("sha256").update(key.trim()).digest("hex");
}

export function generateLeadMachineApiKey() {
  const raw = `lm_${randomBytes(24).toString("hex")}`;
  return {
    key: raw,
    hash: hashLeadMachineApiKey(raw),
    hint: raw.slice(-4),
  };
}

export async function verifyLeadIngestRequest(request: Request) {
  const authHeader = request.headers.get("authorization");
  const headerKey = request.headers.get("x-sheetomatic-leads-key");

  let apiKey: string | null = null;
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    apiKey = authHeader.slice(7).trim();
  } else if (headerKey?.trim()) {
    apiKey = headerKey.trim();
  }

  if (!apiKey) {
    return { ok: false as const, reason: "missing_key" };
  }

  const hash = hashLeadMachineApiKey(apiKey);
  const org = await prisma.organization.findFirst({
    where: { leadMachineApiKeyHash: hash },
    select: { id: true, name: true },
  });

  if (!org) {
    return { ok: false as const, reason: "invalid_key" };
  }

  return { ok: true as const, organizationId: org.id };
}
