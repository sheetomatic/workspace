import { NextResponse } from "next/server";
import {
  encodeLearnSession,
  findEnrollmentForStudentLogin,
  LEARN_COOKIE,
} from "@/lib/learn/session";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim() ?? "";
  const enrollment = token
    ? await findEnrollmentForStudentLogin({ token })
    : null;

  if (!enrollment) {
    const fail = new URL("/learn/login", url.origin);
    fail.searchParams.set("error", "token");
    return NextResponse.redirect(fail);
  }

  const res = NextResponse.redirect(new URL("/learn", url.origin));
  res.cookies.set(LEARN_COOKIE, encodeLearnSession(enrollment.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
