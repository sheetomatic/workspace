import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  APP_BUILDER_GOOGLE_COOKIE,
  APP_BUILDER_GOOGLE_SCOPES,
  appBuilderGoogleRedirectUri,
  createAppBuilderOAuthClient,
  isAppBuilderGoogleConfigured,
  newAppBuilderGoogleState,
} from "@/lib/app-builder/google";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?product=app-builder", request.url));
  }
  if (!isAppBuilderGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/app/app-builder?google=missing", request.url),
    );
  }

  const redirectUri = appBuilderGoogleRedirectUri(request);
  const oauth2 = createAppBuilderOAuthClient(redirectUri);
  if (!oauth2) {
    return NextResponse.redirect(
      new URL("/app/app-builder?google=missing", request.url),
    );
  }

  const { nonce, signed } = newAppBuilderGoogleState(user.organizationId);
  const jar = await cookies();
  jar.set(APP_BUILDER_GOOGLE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: redirectUri.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [...APP_BUILDER_GOOGLE_SCOPES],
    state: signed,
  });

  return NextResponse.redirect(url);
}
