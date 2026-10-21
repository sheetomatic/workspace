import { NextResponse } from "next/server";
import { requireSession } from "@/lib/require-session";
import { completeLinkedInOAuth, verifyLinkedInState } from "@/lib/leads/linkedin";

function settingsUrl(requestUrl: string, status: string) {
  const url = new URL("/app/leads/settings", requestUrl);
  url.searchParams.set("linkedin", status);
  return url;
}

export async function GET(request: Request) {
  const user = await requireSession(undefined, { module: "CRM" });
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = verifyLinkedInState(url.searchParams.get("state") ?? "");
  if (!code || !state || state.organizationId !== user.organizationId || state.userId !== user.id) {
    return NextResponse.redirect(settingsUrl(request.url, "invalid-state"));
  }
  try {
    await completeLinkedInOAuth({ organizationId: user.organizationId, code });
    return NextResponse.redirect(settingsUrl(request.url, "connected"));
  } catch (error) {
    console.error("LinkedIn OAuth callback", error);
    return NextResponse.redirect(settingsUrl(request.url, "failed"));
  }
}
