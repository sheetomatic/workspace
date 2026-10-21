import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { completeLinkedInOAuth, verifyLinkedInState } from "@/lib/leads/linkedin";

function settingsUrl(status: string) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com";
  return new URL(`/app/leads/settings?linkedin=${status}`, origin);
}

export async function GET(request: Request) {
  const user = await requireSession(undefined, { module: "CRM" });
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = verifyLinkedInState(url.searchParams.get("state") ?? "");
  if (!code || !state || state.organizationId !== user.organizationId || state.userId !== user.id) {
    return NextResponse.redirect(settingsUrl("invalid-state"));
  }
  try {
    await completeLinkedInOAuth({ organizationId: user.organizationId, code });
    return NextResponse.redirect(settingsUrl("connected"));
  } catch (error) {
    console.error("LinkedIn OAuth callback", error);
    return NextResponse.redirect(settingsUrl("failed"));
  }
}
