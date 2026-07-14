import { prisma } from "@/lib/db";
import {
  getHolidayCatalog,
  isHolidayRegion,
  MAX_HOLIDAYS_PER_YEAR,
  type HolidayRegion,
} from "@/lib/hr/holiday-catalog";

function isWeekday(date: Date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function noonDate(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function holidayNotes(name: string) {
  return `Holiday: ${name}`;
}

/** Remove auto-synced HOLIDAY attendance rows for a date (notes prefix match). */
export async function clearSyncedHolidayAttendance(params: {
  organizationId: string;
  date: Date;
}) {
  const workDate = noonDate(params.date);
  const result = await prisma.attendanceRecord.deleteMany({
    where: {
      organizationId: params.organizationId,
      workDate,
      status: "HOLIDAY",
      notes: { startsWith: "Holiday:" },
    },
  });
  return { cleared: result.count };
}

/**
 * Upsert HOLIDAY attendance for all active non-VIEWER members on a weekday holiday.
 *
 * Optional holidays (`isOptional`): employees may work or take leave —
 * do NOT force HOLIDAY attendance. If they punch PRESENT they stay present;
 * if they take leave it counts as leave. Restricted (dept-scoped) holidays
 * are deferred to Phase 2b.
 */
export async function syncHolidayAttendance(params: {
  organizationId: string;
  date: Date;
  name: string;
  isOptional?: boolean;
}) {
  const workDate = noonDate(params.date);
  if (!isWeekday(workDate)) {
    return { synced: 0 };
  }
  // Optional holidays do not auto-mark attendance — clear any prior synced HOLIDAY rows.
  if (params.isOptional) {
    await clearSyncedHolidayAttendance({
      organizationId: params.organizationId,
      date: workDate,
    });
    return { synced: 0 };
  }

  const members = await prisma.membership.findMany({
    where: {
      organizationId: params.organizationId,
      deactivatedAt: null,
      role: { not: "VIEWER" },
    },
    select: { userId: true },
  });

  const notes = holidayNotes(params.name);
  let synced = 0;
  for (const member of members) {
    // Do not overwrite real attendance, approved leave, or manager-entered rows.
    // Only create missing rows or refresh rows previously auto-synced by this helper.
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        organizationId_userId_workDate: {
          organizationId: params.organizationId,
          userId: member.userId,
          workDate,
        },
      },
      select: { status: true, notes: true },
    });
    if (
      existing &&
      !(existing.status === "HOLIDAY" && existing.notes?.startsWith("Holiday:"))
    ) {
      continue;
    }

    await prisma.attendanceRecord.upsert({
      where: {
        organizationId_userId_workDate: {
          organizationId: params.organizationId,
          userId: member.userId,
          workDate,
        },
      },
      create: {
        organizationId: params.organizationId,
        userId: member.userId,
        workDate,
        status: "HOLIDAY",
        method: "WEB",
        notes,
      },
      update: {
        status: "HOLIDAY",
        notes,
        checkInAt: null,
        checkOutAt: null,
      },
    });
    synced += 1;
  }
  return { synced };
}

export async function listHolidays(organizationId: string, year?: number) {
  const y = year ?? new Date().getUTCFullYear();
  const start = new Date(Date.UTC(y, 0, 1, 12, 0, 0, 0));
  const end = new Date(Date.UTC(y, 11, 31, 12, 0, 0, 0));
  return prisma.hrHoliday.findMany({
    where: {
      organizationId,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });
}

export async function createHoliday(params: {
  organizationId: string;
  date: Date;
  name: string;
  isOptional?: boolean;
}) {
  const name = params.name.trim();
  if (!name) {
    throw new Error("Holiday name is required.");
  }
  const date = noonDate(params.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid holiday date.");
  }

  const existingForDate = await prisma.hrHoliday.findUnique({
    where: {
      organizationId_date: {
        organizationId: params.organizationId,
        date,
      },
    },
    select: { id: true },
  });
  if (!existingForDate) {
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1, 12, 0, 0, 0));
    const yearEnd = new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 12, 0, 0, 0));
    const existingCount = await prisma.hrHoliday.count({
      where: {
        organizationId: params.organizationId,
        date: { gte: yearStart, lte: yearEnd },
      },
    });
    if (existingCount >= MAX_HOLIDAYS_PER_YEAR) {
      throw new Error(
        `Holiday calendar already has ${MAX_HOLIDAYS_PER_YEAR} holidays for ${date.getUTCFullYear()}. Delete one before adding another.`,
      );
    }
  }

  const holiday = await prisma.hrHoliday.upsert({
    where: {
      organizationId_date: {
        organizationId: params.organizationId,
        date,
      },
    },
    create: {
      organizationId: params.organizationId,
      date,
      name,
      isOptional: params.isOptional === true,
    },
    update: {
      name,
      isOptional: params.isOptional === true,
    },
  });

  await syncHolidayAttendance({
    organizationId: params.organizationId,
    date: holiday.date,
    name: holiday.name,
    isOptional: holiday.isOptional,
  });

  return holiday;
}

export async function importDefaultHolidays(params: {
  organizationId: string;
  year: number;
  region: HolidayRegion;
}) {
  const year =
    Number.isFinite(params.year) && params.year >= 2000 && params.year <= 2100
      ? Math.trunc(params.year)
      : new Date().getUTCFullYear();
  const region = isHolidayRegion(params.region) ? params.region : "national";
  const catalog = getHolidayCatalog(year, region);

  if (catalog.length !== MAX_HOLIDAYS_PER_YEAR) {
    throw new Error("Holiday catalog is incomplete for the selected year.");
  }

  const existing = await listHolidays(params.organizationId, year);
  const existingDates = new Set(
    existing.map((holiday) => holiday.date.toISOString().slice(0, 10)),
  );
  const newItems = catalog.filter(
    (item) => !existingDates.has(item.date.toISOString().slice(0, 10)),
  );
  if (existing.length + newItems.length > MAX_HOLIDAYS_PER_YEAR) {
    throw new Error(
      `Import would exceed ${MAX_HOLIDAYS_PER_YEAR} holidays for ${year}. Delete extra holidays or import into an empty calendar.`,
    );
  }

  const holidays = [];
  for (const item of catalog) {
    const holiday = await prisma.hrHoliday.upsert({
      where: {
        organizationId_date: {
          organizationId: params.organizationId,
          date: item.date,
        },
      },
      create: {
        organizationId: params.organizationId,
        date: item.date,
        name: item.name,
        isOptional: item.isOptional,
      },
      update: {
        name: item.name,
        isOptional: item.isOptional,
      },
    });
    await syncHolidayAttendance({
      organizationId: params.organizationId,
      date: holiday.date,
      name: holiday.name,
      isOptional: holiday.isOptional,
    });
    holidays.push(holiday);
  }

  return { imported: holidays.length, holidays };
}

export async function updateHoliday(params: {
  organizationId: string;
  id: string;
  name?: string;
  isOptional?: boolean;
}) {
  const existing = await prisma.hrHoliday.findFirst({
    where: { id: params.id, organizationId: params.organizationId },
  });
  if (!existing) {
    throw new Error("Holiday not found.");
  }

  const holiday = await prisma.hrHoliday.update({
    where: { id: existing.id },
    data: {
      ...(params.name != null ? { name: params.name.trim() || existing.name } : {}),
      ...(params.isOptional != null ? { isOptional: params.isOptional } : {}),
    },
  });

  await syncHolidayAttendance({
    organizationId: params.organizationId,
    date: holiday.date,
    name: holiday.name,
    isOptional: holiday.isOptional,
  });

  return holiday;
}

export async function deleteHoliday(params: {
  organizationId: string;
  id: string;
}) {
  const existing = await prisma.hrHoliday.findFirst({
    where: { id: params.id, organizationId: params.organizationId },
  });
  if (!existing) {
    throw new Error("Holiday not found.");
  }

  await prisma.hrHoliday.delete({ where: { id: existing.id } });

  await clearSyncedHolidayAttendance({
    organizationId: params.organizationId,
    date: existing.date,
  });

  return { ok: true as const };
}
