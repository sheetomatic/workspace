import { prisma } from "@/lib/db";

export type HrShiftInput = {
  id?: string;
  name: string;
  code?: string | null;
  startTime: string;
  endTime: string;
  isDefault?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

export type ResolvedTiming = {
  workStartTime: string;
  workEndTime: string;
  lateGraceMinutes: number;
  shortLeaveHours: number;
  shiftId: string | null;
  shiftName: string | null;
  source: "shift" | "org_default";
};

function normalizeTime(raw: string, fallback: string): string {
  const value = raw.trim();
  if (!/^\d{1,2}:\d{2}$/.test(value)) return fallback;
  const [h, m] = value.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) return fallback;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function getHrSettings(organizationId: string) {
  return prisma.workspaceHrSettings.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
}

export async function listHrShifts(organizationId: string, activeOnly = false) {
  return prisma.hrShift.findMany({
    where: {
      organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

/** Ensure at least one General shift exists from org default hours. */
export async function ensureDefaultHrShift(organizationId: string) {
  const existing = await prisma.hrShift.findFirst({
    where: { organizationId },
    select: { id: true },
  });
  if (existing) return existing;

  const settings = await getHrSettings(organizationId);
  return prisma.hrShift.create({
    data: {
      organizationId,
      name: "General",
      code: "GEN",
      startTime: settings.workStartTime || "09:30",
      endTime: settings.workEndTime || "18:30",
      isDefault: true,
      isActive: true,
      sortOrder: 0,
    },
  });
}

export async function saveHrShift(organizationId: string, input: HrShiftInput) {
  const name = input.name.trim();
  if (!name) throw new Error("Shift name is required.");
  const startTime = normalizeTime(input.startTime, "09:30");
  const endTime = normalizeTime(input.endTime, "18:30");
  const code = input.code?.trim().toUpperCase() || null;

  if (input.isDefault) {
    await prisma.hrShift.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  if (input.id) {
    const owned = await prisma.hrShift.findFirst({
      where: { id: input.id, organizationId },
      select: { id: true },
    });
    if (!owned) throw new Error("Shift not found.");
    return prisma.hrShift.update({
      where: { id: input.id },
      data: {
        name,
        code,
        startTime,
        endTime,
        isDefault: input.isDefault ?? false,
        isActive: input.isActive ?? true,
        sortOrder: input.sortOrder ?? 0,
      },
    });
  }

  return prisma.hrShift.create({
    data: {
      organizationId,
      name,
      code,
      startTime,
      endTime,
      isDefault: input.isDefault ?? false,
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function deleteHrShift(organizationId: string, shiftId: string) {
  const assigned = await prisma.membership.count({
    where: { organizationId, shiftId },
  });
  if (assigned > 0) {
    throw new Error(
      `Cannot delete: ${assigned} employee(s) are assigned to this shift. Reassign them first.`,
    );
  }
  const result = await prisma.hrShift.deleteMany({
    where: { id: shiftId, organizationId },
  });
  if (result.count === 0) throw new Error("Shift not found.");
}

/**
 * Resolve timing for late / OT / short-leave: employee shift → default shift → org hours.
 */
export async function resolveEmployeeTiming(
  organizationId: string,
  userId: string,
): Promise<ResolvedTiming> {
  const [settings, membership, defaultShift] = await Promise.all([
    getHrSettings(organizationId),
    prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      select: {
        shiftId: true,
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.hrShift.findFirst({
      where: { organizationId, isActive: true, isDefault: true },
      select: { id: true, name: true, startTime: true, endTime: true },
    }),
  ]);

  const assigned =
    membership?.shift?.isActive !== false ? membership?.shift : null;
  const shift = assigned ?? defaultShift;

  if (shift) {
    return {
      workStartTime: shift.startTime,
      workEndTime: shift.endTime,
      lateGraceMinutes: settings.lateGraceMinutes,
      shortLeaveHours: settings.shortLeaveHours,
      shiftId: shift.id,
      shiftName: shift.name,
      source: assigned ? "shift" : "org_default",
    };
  }

  return {
    workStartTime: settings.workStartTime,
    workEndTime: settings.workEndTime,
    lateGraceMinutes: settings.lateGraceMinutes,
    shortLeaveHours: settings.shortLeaveHours,
    shiftId: null,
    shiftName: null,
    source: "org_default",
  };
}
