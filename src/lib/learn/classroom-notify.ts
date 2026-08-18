import { formatSlotWhen } from "@/lib/courses/slots";
import { sendWhatsAppText } from "@/lib/whatsapp-bot/send";
import { learnPortalOrigin } from "@/lib/workspace-auth-links";
import { studentClassPath } from "@/lib/learn/classroom";

export async function notifyClassroomStarted(params: {
  organizationId: string | null;
  studentName: string;
  studentPhone: string;
  sessionNumber: number;
  startsAt: Date;
  slotId: string;
  meetUrl: string | null;
}) {
  if (!params.organizationId || !params.studentPhone.trim()) {
    return { sent: false as const };
  }
  const join = `${learnPortalOrigin()}${studentClassPath(params.slotId)}`;
  const lines = [
    `Hi ${params.studentName.split(" ")[0] || params.studentName}, your Sheetomatic class has started.`,
    "",
    `Session ${params.sessionNumber} · ${formatSlotWhen(params.startsAt)}`,
    `Join in your student panel: ${join}`,
    params.meetUrl ? `Meet fallback: ${params.meetUrl}` : null,
    "",
    "This class may be recorded. Your trainer will share the Unlisted YouTube in Class files.",
  ].filter(Boolean);

  const result = await sendWhatsAppText({
    organizationId: params.organizationId,
    toPhone: params.studentPhone,
    body: lines.join("\n"),
  });
  return { sent: result.sent };
}
