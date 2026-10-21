import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { createLinkedInState, linkedInAuthorizationUrl } from "@/lib/leads/linkedin";

export async function GET() {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return NextResponse.redirect(new URL("/app/leads/settings?linkedin=forbidden", process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com"));
  }
  try {
    const state = createLinkedInState({ organizationId: user.organizationId, userId: user.id });
    return NextResponse.redirect(linkedInAuthorizationUrl(state));
  } catch {
    return NextResponse.redirect(new URL("/app/leads/settings?linkedin=not-configured", process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com"));
  }
}
