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
import {
  classroomMaxParticipants,
  earliestClassroomStartedAt,
  groupClassIdentity,
  latestSlotEndsAt,
  pickLiveGroupClassroom,
  roomNameForGroup,
} from "@/lib/learn/group-classroom";
import { listGroupSessionSlots } from "@/lib/learn/group-classroom-slots";
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
          groupMeetUrl: true,
          groupKey: true,
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
  if (loaded.slot.status === "CANCELLED") {
    return { ok: false as const, message: "This session is cancelled." };
  }

  const groupSlots = groupClassIdentity(loaded.slot.enrollment)
    ? await listGroupSessionSlots(loaded.slot)
    : [];
  const sessionSlots = groupSlots.length > 0 ? groupSlots : [loaded.slot];
  const alreadyLive = sessionSlots.some((slot) => isClassroomLive(slot));
  const livePeer = pickLiveGroupClassroom(sessionSlots);
  const identity = groupClassIdentity(loaded.slot.enrollment);

  let roomName =
    livePeer?.classroomRoomName || loaded.slot.classroomRoomName || null;
  let roomUrl = livePeer?.classroomUrl || loaded.slot.classroomUrl || null;
  if (isDailyConfigured()) {
    const name =
      roomName ||
      (identity
        ? roomNameForGroup(identity, loaded.slot.startsAt)
        : roomNameForSlot(loaded.slot.id));
    try {
      const room = await ensureDailyRoom({
        roomName: name,
        expUnix: classroomExpUnix(
          latestSlotEndsAt(sessionSlots, loaded.slot.endsAt),
        ),
        maxParticipants: classroomMaxParticipants(sessionSlots.length),
      });
      roomName = room.name;
      roomUrl = room.url || roomUrl;
    } catch (error) {
      console.error("[classroom] Daily room skipped", error);
    }
  }

  const startedAt = earliestClassroomStartedAt(sessionSlots);
  const slotIds = [...new Set(sessionSlots.map((slot) => slot.id))];
  await prisma.trainingCourseSlot.updateMany({
    where: { id: { in: slotIds } },
    data: {
      classroomRoomName: roomName,
      classroomUrl: roomUrl,
      classroomStartedAt: startedAt,
      classroomEndedAt: null,
      status: "SCHEDULED",
    },
  });

  if (!alreadyLive) {
    for (const slot of sessionSlots) {
      const orgId =
        slot.enrollment.organizationId ||
        slot.organizationId ||
        loaded.user.organizationId;
      try {
        await notifyClassroomStarted({
          organizationId: orgId,
          studentName: slot.enrollment.name,
          studentPhone: slot.enrollment.phone,
          sessionNumber: slot.sessionNumber,
          startsAt: slot.startsAt,
          slotId: slot.id,
          meetUrl:
            slot.enrollment.groupMeetUrl ||
            slot.meetUrl ||
            slot.enrollment.meetUrl,
        });
      } catch (error) {
        console.error("[classroom] WhatsApp start notify failed", error);
      }

      if (slot.inboundLeadId) {
        await logInboundLeadActivity({
          organizationId: loaded.user.organizationId,
          leadId: slot.inboundLeadId,
          type: "NOTE",
          body:
            sessionSlots.length > 1
              ? `Training session ${slot.sessionNumber} group class started in the Learn panel (${sessionSlots.length} students).`
              : `Training session ${slot.sessionNumber} class started in the Learn panel.`,
          createdByUserId: loaded.user.id,
        });
      }
    }
  }

  revalidateClassroom();
  const groupCount = sessionSlots.length;
  return {
    ok: true as const,
    message: alreadyLive
      ? "Entering class."
      : groupCount > 1
        ? `Class started for ${groupCount} students. They can Join class on Learn.`
        : "Class started. Student was pinged on WhatsApp.",
    path: teacherClassPath(loaded.slot.id),
  };
}

export async function endTrainingClassroomAction(slotId: string) {
  const loaded = await loadManageableSlot(slotId);
  if (!loaded.ok) return loaded;

  const groupSlots = groupClassIdentity(loaded.slot.enrollment)
    ? await listGroupSessionSlots(loaded.slot)
    : [];
  const activitySlots = groupSlots.length > 0 ? groupSlots : [loaded.slot];
  const roomName = loaded.slot.classroomRoomName;
  if (roomName && isDailyConfigured()) {
    await deleteDailyRoom(roomName);
  }

  const endedAt = new Date();
  const endIds = [
    ...new Set(activitySlots.map((slot) => slot.id)),
    loaded.slot.id,
  ];
  await prisma.trainingCourseSlot.updateMany({
    where: {
      OR: [
        { id: { in: endIds } },
        roomName
          ? { classroomRoomName: roomName, classroomEndedAt: null }
          : { id: loaded.slot.id },
      ],
    },
    data: {
      classroomEndedAt: endedAt,
      status: "COMPLETED",
    },
  });
  const noted = new Set<string>();
  for (const slot of activitySlots) {
    if (!slot.inboundLeadId || noted.has(slot.inboundLeadId)) continue;
    noted.add(slot.inboundLeadId);
    await logInboundLeadActivity({
      organizationId: loaded.user.organizationId,
      leadId: slot.inboundLeadId,
      type: "NOTE",
      body: `Training session ${slot.sessionNumber} class ended. Click Update Learn to attach the recording and lesson.`,
      createdByUserId: loaded.user.id,
    });
  }

  revalidateClassroom();
  return {
    ok: true as const,
    message: "Class ended. Click Update Learn to put the recording and lesson on the student panel.",
  };
}
