import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  bookTrainingSlots,
  getEnrollmentSlotsByToken,
} from "@/lib/courses/slots";
import { courseCohortLabel } from "@/lib/content/courses-enrollment";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing booking token." }, { status: 400 });
  }

  const enrollment = await getEnrollmentSlotsByToken(token);
  if (!enrollment) {
    return NextResponse.json({ error: "Booking link not found." }, { status: 404 });
  }

  return NextResponse.json({
    enrollment: {
      id: enrollment.id,
      name: enrollment.name,
      email: enrollment.email,
      phone: enrollment.phone,
      cohort: enrollment.cohort,
      cohortLabel: courseCohortLabel(enrollment.cohort),
      status: enrollment.status,
      programStartDate: enrollment.programStartDate,
      meetUrl: enrollment.meetUrl,
      slotsBooked: enrollment.slots.length,
      slots: enrollment.slots.map((slot) => ({
        id: slot.id,
        sessionNumber: slot.sessionNumber,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        title: slot.title,
        status: slot.status,
        meetUrl: slot.meetUrl,
      })),
    },
  });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const programStartYmd = String(body.programStartYmd ?? "").trim();
  const meetUrl = body.meetUrl != null ? String(body.meetUrl).trim() : null;
  if (!token) {
    return NextResponse.json({ error: "Missing booking token." }, { status: 400 });
  }
  if (!programStartYmd) {
    return NextResponse.json(
      { error: "Choose your first session date." },
      { status: 400 },
    );
  }

  const enrollment = await prisma.courseEnrollment.findFirst({
    where: { bookingToken: token },
    select: { id: true, status: true },
  });
  if (!enrollment) {
    return NextResponse.json({ error: "Booking link not found." }, { status: 404 });
  }
  if (enrollment.status === "CANCELLED") {
    return NextResponse.json(
      { error: "This enrollment was cancelled." },
      { status: 400 },
    );
  }
  if (enrollment.status !== "CONFIRMED") {
    return NextResponse.json(
      {
        error:
          "Payment is not confirmed yet. After Sheetomatic confirms payment you can book slots here.",
      },
      { status: 400 },
    );
  }

  const result = await bookTrainingSlots({
    enrollmentId: enrollment.id,
    programStartYmd,
    meetUrl,
    notify: true,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: result.message,
    slotCount: result.slots.length,
  });
}
