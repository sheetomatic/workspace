import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findTrainingSlotForStaff } from "@/lib/courses/session-materials";
import {
  parseClassroomBoard,
  type ClassroomBoard,
} from "@/lib/learn/classroom-board";
import { getLearnEnrollment } from "@/lib/learn/session";
import { hasMinimumRole } from "@/lib/permissions";

export const runtime = "nodejs";

async function canReadBoard(slotId: string) {
  const student = await getLearnEnrollment();
  if (student) {
    const slot = await prisma.trainingCourseSlot.findFirst({
      where: { id: slotId, enrollmentId: student.id },
      select: { id: true, classroomBoard: true, classroomBoardRev: true },
    });
    return slot;
  }

  const staff = await getSessionUser();
  if (!staff || (!hasMinimumRole(staff.role, "STAFF") && !staff.isSuperAdmin)) {
    return null;
  }
  const allowed = await findTrainingSlotForStaff(
    slotId,
    staff.organizationId,
    staff.isSuperAdmin,
  );
  if (!allowed) return null;
  return prisma.trainingCourseSlot.findFirst({
    where: { id: slotId },
    select: { id: true, classroomBoard: true, classroomBoardRev: true },
  });
}

async function canWriteBoard(slotId: string) {
  const staff = await getSessionUser();
  if (!staff || (!hasMinimumRole(staff.role, "STAFF") && !staff.isSuperAdmin)) {
    return null;
  }
  return findTrainingSlotForStaff(slotId, staff.organizationId, staff.isSuperAdmin);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slotId: string }> },
) {
  const { slotId } = await params;
  const slot = await canReadBoard(slotId);
  if (!slot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const since = Number(new URL(request.url).searchParams.get("rev") || 0);
  if (since && since === slot.classroomBoardRev) {
    return NextResponse.json({ rev: slot.classroomBoardRev, unchanged: true });
  }
  return NextResponse.json({
    rev: slot.classroomBoardRev,
    board: parseClassroomBoard(slot.classroomBoard),
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slotId: string }> },
) {
  const { slotId } = await params;
  const allowed = await canWriteBoard(slotId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { board?: ClassroomBoard };
  try {
    body = (await request.json()) as { board?: ClassroomBoard };
  } catch {
    return NextResponse.json({ error: "Invalid board" }, { status: 400 });
  }

  const board = parseClassroomBoard(body.board);
  const updated = await prisma.trainingCourseSlot.update({
    where: { id: slotId },
    data: {
      classroomBoard: board as Prisma.InputJsonValue,
      classroomBoardRev: { increment: 1 },
    },
    select: { classroomBoardRev: true },
  });

  return NextResponse.json({ rev: updated.classroomBoardRev, board });
}
