import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { createLinkedInState, linkedInAuthorizationUrl } from "@/lib/leads/linkedin";

export async function GET(request: Request) {
  const user = await requireSession(undefined, { module: "CRM" });
  const settingsUrl = new URL("/app/leads/settings", request.url);
  if (!hasMinimumRole(user.role, "ADMIN")) {
    settingsUrl.searchParams.set("linkedin", "forbidden");
    return NextResponse.redirect(settingsUrl);
  }
  try {
    const state = createLinkedInState({ organizationId: user.organizationId, userId: user.id });
    return NextResponse.redirect(linkedInAuthorizationUrl(state));
  } catch {
    settingsUrl.searchParams.set("linkedin", "not-configured");
    return NextResponse.redirect(settingsUrl);
  }
}
