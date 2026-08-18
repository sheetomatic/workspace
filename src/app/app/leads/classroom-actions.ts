"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import {
  classroomExpUnix,
  isClassroomLive,
  roomNameForSlot,
  teacherClassPath,
} from "@/lib/learn/classroom";
import { notifyClassroomStarted } from "@/lib/learn/classroom-notify";
import {
  deleteDailyRoom,
  ensureDailyRoom,
  isDailyConfigured,
} from "@/lib/learn/daily";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";

function revalidateClassroom() {
  revalidatePath("/app/leads/training");
  revalidatePath("/app/my-space/training");
  revalidatePath("/learn");
  revalidatePath("/learn/schedule");
}

async function loadManageableSlot(slotId: string) {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "STAFF") && !user.isSuperAdmin) {
    return { ok: false as const, message: "Staff access required." };
  }

  const slot = await prisma.trainingCourseSlot.findFirst({
    where: { id: slotId },
    include: {
      enrollment: {
        select: {
          id: true,
          name: true,
          phone: true,
          organizationId: true,
          inboundLeadId: true,
          meetUrl: true,
        },
      },
    },
  });
  if (!slot) {
    return { ok: false as const, message: "Session not found." };
  }

  let inOrg = slot.organizationId === user.organizationId;
  if (!inOrg && slot.inboundLeadId) {
    const lead = await prisma.inboundLead.findFirst({
      where: { id: slot.inboundLeadId, organizationId: user.organizationId },
      select: { id: true },
    });
    inOrg = Boolean(lead);
  }
  if (!inOrg && !user.isSuperAdmin) {
    return { ok: false as const, message: "Session not found." };
  }

  return { ok: true as const, user, slot };
}

export async function startTrainingClassroomAction(slotId: string) {
  const loaded = await loadManageableSlot(slotId);
  if (!loaded.ok) return loaded;
  if (!isDailyConfigured()) {
    return {
      ok: false as const,
      message:
        "Add DAILY_API_KEY on Vercel (Daily.co) to start class in this panel. Meet fallback still works.",
    };
  }
  if (loaded.slot.status === "CANCELLED") {
    return { ok: false as const, message: "This session is cancelled." };
  }

  const roomName = loaded.slot.classroomRoomName || roomNameForSlot(loaded.slot.id);
  const room = await ensureDailyRoom({
    roomName,
    expUnix: classroomExpUnix(loaded.slot.endsAt),
  });
  if (!room.url) {
    return { ok: false as const, message: "Daily did not return a room URL." };
  }

  const alreadyLive = isClassroomLive(loaded.slot);
  await prisma.trainingCourseSlot.update({
    where: { id: loaded.slot.id },
    data: {
      classroomRoomName: room.name,
      classroomUrl: room.url,
      classroomStartedAt: loaded.slot.classroomStartedAt ?? new Date(),
      classroomEndedAt: null,
      status: "SCHEDULED",
    },
  });

  if (!alreadyLive) {
    const orgId =
      loaded.slot.enrollment.organizationId ||
      loaded.slot.organizationId ||
      loaded.user.organizationId;
    try {
      await notifyClassroomStarted({
        organizationId: orgId,
        studentName: loaded.slot.enrollment.name,
        studentPhone: loaded.slot.enrollment.phone,
        sessionNumber: loaded.slot.sessionNumber,
        startsAt: loaded.slot.startsAt,
        slotId: loaded.slot.id,
        meetUrl: loaded.slot.meetUrl || loaded.slot.enrollment.meetUrl,
      });
    } catch (error) {
      console.error("[classroom] WhatsApp start notify failed", error);
    }

    if (loaded.slot.inboundLeadId) {
      await logInboundLeadActivity({
        organizationId: loaded.user.organizationId,
        leadId: loaded.slot.inboundLeadId,
        type: "NOTE",
        body: `Training session ${loaded.slot.sessionNumber} class started in the Learn panel.`,
        createdByUserId: loaded.user.id,
      });
    }
  }

  revalidateClassroom();
  return {
    ok: true as const,
    message: alreadyLive ? "Entering class." : "Class started. Student was pinged on WhatsApp.",
    path: teacherClassPath(loaded.slot.id),
  };
}

export async function endTrainingClassroomAction(slotId: string) {
  const loaded = await loadManageableSlot(slotId);
  if (!loaded.ok) return loaded;

  if (loaded.slot.classroomRoomName) {
    await deleteDailyRoom(loaded.slot.classroomRoomName);
  }

  await prisma.trainingCourseSlot.update({
    where: { id: loaded.slot.id },
    data: {
      classroomEndedAt: new Date(),
      status: "COMPLETED",
    },
  });

  if (loaded.slot.inboundLeadId) {
    await logInboundLeadActivity({
      organizationId: loaded.user.organizationId,
      leadId: loaded.slot.inboundLeadId,
      type: "NOTE",
      body: `Training session ${loaded.slot.sessionNumber} class ended. Paste the Unlisted YouTube in Class files.`,
      createdByUserId: loaded.user.id,
    });
  }

  revalidateClassroom();
  return {
    ok: true as const,
    message: "Class ended. Paste the Unlisted YouTube on this session.",
  };
}
