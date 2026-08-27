"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  parseAppBuilderStudioInput,
  saveAppBuilderStudio,
} from "@/lib/app-builder/persist";
import { sendPlainEmail } from "@/lib/integrations/email";
import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";

export async function saveAppBuilderStudioAction(raw: {
  config: unknown;
  workbook: unknown;
  templateId?: string | null;
}): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in to save the app." };
  }
  const parsed = parseAppBuilderStudioInput(raw);
  if (!parsed) {
    return { ok: false, message: "Could not save — pick a template or connect a Sheet first." };
  }
  await saveAppBuilderStudio(user.organizationId, parsed);
  revalidatePath("/app/app-builder");
  return { ok: true, message: "App saved." };
}

export async function dispatchAppBuilderBotAction(
  actions: {
    kind: "email" | "whatsapp";
    to?: string;
    subject?: string;
    body?: string;
  }[],
): Promise<{ ok: boolean; message: string }> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in to send from a bot." };
  }
  const notes: string[] = [];
  for (const action of actions.slice(0, 8)) {
    const to = String(action.to || "").trim();
    const body = String(action.body || "").trim();
    if (action.kind === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !body) {
        notes.push("Email skipped — need a real address and body.");
        continue;
      }
      const result = await sendPlainEmail({
        toEmail: to,
        subject: String(action.subject || "App update").slice(0, 160),
        text: body.slice(0, 4000),
      });
      notes.push(result.sent ? `Email sent to ${to}` : `Email not sent (${result.reason})`);
      continue;
    }
    const phone = to.replace(/\D/g, "").slice(-10);
    if (phone.length !== 10 || !body) {
      notes.push("WhatsApp skipped — need a 10-digit phone and a message.");
      continue;
    }
    const result = await sendWhatsAppText({
      organizationId: user.organizationId,
      toPhone: phone,
      body: body.slice(0, 1000),
    });
    notes.push(result.sent ? `WhatsApp sent to ${phone}` : "WhatsApp not sent — connect Official API in Settings.");
  }
  return {
    ok: notes.some((note) => /sent/.test(note)),
    message: notes.join(" ") || "Nothing to send.",
  };
}
