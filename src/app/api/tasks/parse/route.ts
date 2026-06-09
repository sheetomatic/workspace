import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { parseTaskFromInstruction } from "@/lib/integrations/openai";
import {
  checkTaskAiOrgQuota,
  recordTaskAiUsage,
} from "@/lib/integrations/task-ai-settings";
import {
  AI_PARSE_UNAVAILABLE,
  mapOpenAiServiceError,
} from "@/lib/integrations/openai-messages";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { hasMinimumRole } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { listAssignableMembers } from "@/lib/tasks";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await checkRateLimit(
    `parse:${user.organizationId}:${user.id}`,
    30,
    60_000,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rate.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const orgQuota = await checkTaskAiOrgQuota(user.organizationId);
  if (!orgQuota.allowed) {
    return NextResponse.json({ error: orgQuota.message }, { status: 429 });
  }

  const status = getIntegrationStatus();
  if (!status.openai) {
    return NextResponse.json({ error: AI_PARSE_UNAVAILABLE }, { status: 503 });
  }

  let body: { instruction?: string };
  try {
    body = (await request.json()) as { instruction?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const instruction = body.instruction?.trim() ?? "";
  if (instruction.length < 8) {
    return NextResponse.json(
      { error: "Describe the task in at least a few words." },
      { status: 400 },
    );
  }

  const members = await listAssignableMembers(user.organizationId);
  const hints = members.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
  }));

  try {
    const { draft, usage } = await parseTaskFromInstruction(instruction, hints);
    await recordTaskAiUsage({
      organizationId: user.organizationId,
      userId: user.id,
      route: "parse",
      usage: {
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
      },
    });
    return NextResponse.json({ draft });
  } catch (error) {
    const raw =
      error instanceof Error ? error.message : "Failed to parse instruction.";
    const message = mapOpenAiServiceError(raw);
    if (raw === "OPENAI_NOT_CONFIGURED") {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    if (raw.startsWith("OPENAI_ERROR:")) {
      return NextResponse.json(
        { error: mapOpenAiServiceError(raw.replace(/^OPENAI_ERROR:/, "")) },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
