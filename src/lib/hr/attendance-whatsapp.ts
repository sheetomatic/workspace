import type { AttendanceDayStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { istCalendarYmd, istNoonDate } from "@/lib/hr/payroll";

export const WA_ATTENDANCE_PREFIX = "att:";

export type AttendanceWaChoice = "present" | "late" | "absent";

export function attendanceButtonId(
  choice: AttendanceWaChoice,
  workDateYmd: string,
) {
  return `${WA_ATTENDANCE_PREFIX}${choice}:${workDateYmd}`;
}

export function parseAttendanceButtonId(
  id: string | undefined | null,
): { choice: AttendanceWaChoice; workDateYmd: string } | null {
  if (!id?.startsWith(WA_ATTENDANCE_PREFIX)) {
    return null;
  }
  const rest = id.slice(WA_ATTENDANCE_PREFIX.length);
  const match = /^(present|late|absent):(\d{4}-\d{2}-\d{2})$/.exec(rest);
  if (!match) {
    return null;
  }
  return {
    choice: match[1] as AttendanceWaChoice,
    workDateYmd: match[2],
  };
}

/** Plain-text fallback when buttons cannot be sent / tapped. */
export function parseAttendanceTextChoice(
  text: string,
): AttendanceWaChoice | null {
  const normalized = text.trim().toLowerCase().replace(/[!.,]/g, "");
  if (
    normalized === "present" ||
    normalized === "1" ||
    normalized === "p" ||
    normalized === "yes"
  ) {
    return "present";
  }
  if (normalized === "late" || normalized === "2" || normalized === "l") {
    return "late";
  }
  if (
    normalized === "absent" ||
    normalized === "3" ||
    normalized === "a" ||
    normalized === "no"
  ) {
    return "absent";
  }
  return null;
}

export function buildAttendanceMarkButtons(params: {
  workDateYmd: string;
  firstName: string;
  orgName: string;
  window: "morning" | "evening";
  workStartTime: string;
}) {
  const when =
    params.window === "morning"
      ? "morning attendance"
      : "evening attendance";
  return {
    type: "button" as const,
    body: {
      text: [
        `*Mark your attendance*`,
        "",
        `Hi ${params.firstName}, tap one button for today's ${when}.`,
        `Work starts at ${params.workStartTime}. *Late* = present but after start.`,
        "",
        `Team: ${params.orgName}`,
      ].join("\n"),
    },
    footer: { text: "WhatsApp only — no app needed" },
    action: {
      buttons: [
        {
          type: "reply" as const,
          reply: {
            id: attendanceButtonId("present", params.workDateYmd),
            title: "Present",
          },
        },
        {
          type: "reply" as const,
          reply: {
            id: attendanceButtonId("late", params.workDateYmd),
            title: "Late",
          },
        },
        {
          type: "reply" as const,
          reply: {
            id: attendanceButtonId("absent", params.workDateYmd),
            title: "Absent",
          },
        },
      ],
    },
  };
}

export function attendanceMarkFallbackText(params: {
  firstName: string;
  orgName: string;
  window: "morning" | "evening";
  workStartTime: string;
}) {
  const when =
    params.window === "morning"
      ? "morning attendance"
      : "evening attendance";
  return [
    `*Mark your attendance*`,
    "",
    `Hi ${params.firstName}, reply with one word for today's ${when}:`,
    `*Present*  |  *Late*  |  *Absent*`,
    `Work starts at ${params.workStartTime}.`,
    "",
    `Team: ${params.orgName}`,
  ].join("\n");
}

function choiceToStatus(choice: AttendanceWaChoice): {
  status: AttendanceDayStatus;
  isLate: boolean;
  setsCheckIn: boolean;
} {
  if (choice === "absent") {
    return { status: "ABSENT", isLate: false, setsCheckIn: false };
  }
  if (choice === "late") {
    return { status: "PRESENT", isLate: true, setsCheckIn: true };
  }
  return { status: "PRESENT", isLate: false, setsCheckIn: true };
}

export function attendanceChoiceLabel(choice: AttendanceWaChoice) {
  if (choice === "late") return "Late";
  if (choice === "absent") return "Absent";
  return "Present";
}

/**
 * Mark today's attendance from a WhatsApp button/text reply.
 * Tenant + user come from webhook membership — never from the client alone.
 */
export async function markAttendanceFromWhatsApp(params: {
  organizationId: string;
  userId: string;
  choice: AttendanceWaChoice;
  /** Must match today IST, or the mark is rejected as stale. */
  workDateYmd: string;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const todayYmd = istCalendarYmd(now);
  if (params.workDateYmd !== todayYmd) {
    return {
      ok: false as const,
      reason: "stale_date" as const,
      message: `That attendance button was for ${params.workDateYmd}. Tap today's message, or reply Present / Late / Absent.`,
    };
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: params.userId,
        organizationId: params.organizationId,
      },
    },
    select: { id: true, deactivatedAt: true },
  });
  if (!membership || membership.deactivatedAt) {
    return {
      ok: false as const,
      reason: "not_member" as const,
      message: "Your WhatsApp number is not linked to this team's attendance.",
    };
  }

  const workDate = istNoonDate(params.workDateYmd);
  const mapped = choiceToStatus(params.choice);
  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      organizationId_userId_workDate: {
        organizationId: params.organizationId,
        userId: params.userId,
        workDate,
      },
    },
    select: {
      status: true,
      isLate: true,
      checkInAt: true,
    },
  });

  if (
    existing &&
    existing.status === mapped.status &&
    Boolean(existing.isLate) === mapped.isLate &&
    (mapped.setsCheckIn ? Boolean(existing.checkInAt) : !existing.checkInAt)
  ) {
    return {
      ok: true as const,
      already: true as const,
      choice: params.choice,
      message: `Already marked *${attendanceChoiceLabel(params.choice)}* for today.`,
    };
  }

  if (
    existing &&
    (existing.status === "ON_LEAVE" || existing.status === "HOLIDAY")
  ) {
    return {
      ok: false as const,
      reason: "on_leave" as const,
      message: `You are marked *${existing.status === "ON_LEAVE" ? "On leave" : "Holiday"}* today — no self mark needed.`,
    };
  }

  await prisma.attendanceRecord.upsert({
    where: {
      organizationId_userId_workDate: {
        organizationId: params.organizationId,
        userId: params.userId,
        workDate,
      },
    },
    create: {
      organizationId: params.organizationId,
      userId: params.userId,
      workDate,
      status: mapped.status,
      isLate: mapped.isLate,
      method: "WHATSAPP",
      notes: `Marked via WhatsApp (${attendanceChoiceLabel(params.choice)})`,
      markedById: params.userId,
      verifyStatus: "VERIFIED",
      verifiedById: params.userId,
      verifiedAt: now,
      checkInAt: mapped.setsCheckIn ? now : null,
      checkOutAt: null,
    },
    update: {
      status: mapped.status,
      isLate: mapped.isLate,
      method: "WHATSAPP",
      notes: `Marked via WhatsApp (${attendanceChoiceLabel(params.choice)})`,
      markedById: params.userId,
      verifyStatus: "VERIFIED",
      verifiedById: params.userId,
      verifiedAt: now,
      checkInAt: mapped.setsCheckIn ? existing?.checkInAt ?? now : null,
      ...(mapped.setsCheckIn ? {} : { checkOutAt: null }),
    },
  });

  return {
    ok: true as const,
    already: false as const,
    choice: params.choice,
    message: `Marked *${attendanceChoiceLabel(params.choice)}* for today. Thank you.`,
  };
}
