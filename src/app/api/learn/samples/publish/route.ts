import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getEffectiveCrmSubModulesForUser } from "@/lib/crm/crm-access";
import { publishMsmeWorkbookToGoogle } from "@/lib/learn/publish-msme-sheet";
import { hasMinimumRole } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "Sign in again, then publish." },
      { status: 401 },
    );
  }
  if (!hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json(
      { ok: false, message: "Staff access required." },
      { status: 403 },
    );
  }
  try {
    const { allowed } = await getEffectiveCrmSubModulesForUser(user);
    if (!allowed("training")) {
      return NextResponse.json(
        { ok: false, message: "Training access required." },
        { status: 403 },
      );
    }
  } catch (error) {
    console.error("[learn] training access check failed", error);
  }

  const result = await publishMsmeWorkbookToGoogle();
  return NextResponse.json(result);
}
