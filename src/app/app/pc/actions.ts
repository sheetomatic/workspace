"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { pcWorkHrefKey, type PcWorkKind } from "@/lib/checklists/pc-work";
import { deliverWhatsAppMessage } from "@/lib/integrations/whatsapp-provider";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";

export type PcJobActionState = { ok: boolean; message: string };

function parseKind(value: FormDataEntryValue | null): PcWorkKind | null {
  if (value === "CHECKLIST" || value === "EA_TASK" || value === "FMS_STEP") {
    return value;
  }
  return null;
}

async function loadWork(kind: PcWorkKind, workId: string, organizationId: string) {
  if (kind === "EA_TASK") {
    const task = await prisma.delegatedTask.findFirst({
      where: { id: workId, organizationId },
      select: {
        id: true,
        title: true,
        assigneeUserId: true,
        assignee: { select: { name: true, phone: true } },
      },
    });
    if (!task) return null;
    return {
      id: task.id,
      kind,
      title: task.title,
      doerId: task.assigneeUserId,
      phone: task.assignee.phone,
      doerName: task.assignee.name ?? "teammate",
    };
  }
  if (kind === "CHECKLIST") {
    const run = await prisma.checklistOccurrence.findFirst({
      where: { id: workId, organizationId },
      select: {
        id: true,
        assigneeUserId: true,
        assignee: { select: { name: true, phone: true } },
        template: { select: { title: true } },
      },
    });
    if (!run) return null;
    return {
      id: run.id,
      kind,
      title: run.template.title,
      doerId: run.assigneeUserId,
      phone: run.assignee.phone,
      doerName: run.assignee.name ?? "teammate",
    };
  }
  const step = await prisma.fmsStepState.findFirst({
    where: { id: workId, instance: { organizationId } },
    select: {
      id: true,
      ownerUserId: true,
      owner: { select: { name: true, phone: true } },
      step: { select: { stepName: true } },
    },
  });
  if (!step) return null;
  return {
    id: step.id,
    kind,
    title: step.step.stepName,
    doerId: step.ownerUserId,
    phone: step.owner?.phone ?? null,
    doerName: step.owner?.name ?? "teammate",
  };
}

async function sendPcWhatsApp(phone: string | null | undefined, body: string) {
  const trimmed = phone?.trim();
  if (!trimmed) return;
  const primary = await prisma.organization.findFirst({
    where: { OR: [{ isPrimary: true }, { slug: PRIMARY_ORG_SLUG }] },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!primary) return;
  await deliverWhatsAppMessage({
    organizationId: primary.id,
    toPhone: trimmed,
    preferOfficial: true,
    message: { type: "text", text: { body } },
  });
}

export async function recordPcFollowUp(
  _prev: PcJobActionState,
  formData: FormData,
): Promise<PcJobActionState> {
  try {
    const user = await requireSession(undefined, { module: "TASKS" });
    const kind = parseKind(formData.get("kind"));
    const workId = formData.get("workId")?.toString() ?? "";
    if (!kind || !workId) {
      return { ok: false, message: "Missing work item." };
    }
    const work = await loadWork(kind, workId, user.organizationId);
    if (!work) {
      return { ok: false, message: "Work item not found." };
    }

    const href = pcWorkHrefKey({ kind, id: work.id });
    const pcName = user.name ?? "PC";
    const body = `${pcName} is following up. Please close: ${work.title}`;

    if (work.doerId) {
      await prisma.userAppNotification.create({
        data: {
          userId: work.doerId,
          organizationId: user.organizationId,
          kind: "PC_FOLLOW_UP",
          title: "PC follow-up",
          body,
          href,
        },
      });
    }
    await sendPcWhatsApp(
      work.phone,
      `PC follow-up from ${pcName}: please complete *${work.title}* and reply when done.`,
    );
    revalidatePath("/app/pc");
    return { ok: true, message: `Follow-up logged with ${work.doerName}.` };
  } catch (error) {
    console.error("recordPcFollowUp", error);
    return { ok: false, message: "Could not log follow-up." };
  }
}

export async function markPcJobDone(
  _prev: PcJobActionState,
  formData: FormData,
): Promise<PcJobActionState> {
  try {
    const user = await requireSession(undefined, { module: "TASKS" });
    const kind = parseKind(formData.get("kind"));
    const workId = formData.get("workId")?.toString() ?? "";
    if (!kind || !workId) {
      return { ok: false, message: "Missing work item." };
    }
    const work = await loadWork(kind, workId, user.organizationId);
    if (!work) {
      return { ok: false, message: "Work item not found." };
    }

    const href = pcWorkHrefKey({ kind, id: work.id });
    const pcName = user.name ?? "PC";
    await prisma.userAppNotification.create({
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        kind: "PC_JOB_DONE",
        title: "PC job done",
        body: `${pcName} closed PC follow-up on ${work.title}`,
        href,
      },
    });
    if (work.doerId && work.doerId !== user.id) {
      await prisma.userAppNotification.create({
        data: {
          userId: work.doerId,
          organizationId: user.organizationId,
          kind: "PC_JOB_DONE",
          title: "PC closed follow-up",
          body: `PC marked their chase complete on ${work.title}. Complete your work if it is still open.`,
          href,
        },
      });
    }
    revalidatePath("/app/pc");
    return { ok: true, message: `PC job marked done for ${work.title}.` };
  } catch (error) {
    console.error("markPcJobDone", error);
    return { ok: false, message: "Could not mark PC job done." };
  }
}
