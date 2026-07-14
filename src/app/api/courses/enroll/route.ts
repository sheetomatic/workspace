import { NextResponse } from "next/server";
import {
  createCourseEnrollment,
  isValidCourseCohort,
} from "@/lib/courses/enrollment";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return `course-enroll:${ip}`;
}

export async function POST(request: Request) {
  const rate = await checkRateLimit(clientKey(request), 8, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rate.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  let body: {
    name?: string;
    phone?: string;
    email?: string;
    cohort?: string;
    slotNotes?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const cohort = typeof body.cohort === "string" ? body.cohort : "";
  if (!isValidCourseCohort(cohort)) {
    return NextResponse.json(
      { error: "Please choose Monday + Friday or Tuesday + Saturday." },
      { status: 400 },
    );
  }

  const result = await createCourseEnrollment({
    name: typeof body.name === "string" ? body.name : "",
    phone: typeof body.phone === "string" ? body.phone : "",
    email: typeof body.email === "string" ? body.email : "",
    cohort,
    slotNotes: typeof body.slotNotes === "string" ? body.slotNotes : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    enrollmentId: result.enrollment.id,
    bookingToken: result.enrollment.bookingToken,
    status: result.enrollment.status,
    amountInr: result.enrollment.amountInr,
    cohort: result.enrollment.cohort,
  });
}
