import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  APP_BUILDER_GOOGLE_COOKIE,
  appBuilderGoogleRedirectUri,
  createAppBuilderOAuthClient,
  verifyAppBuilderGoogleState,
} from "@/lib/app-builder/google";

export const runtime = "nodejs";

function studioRedirect(request: Request, query: string) {
  return NextResponse.redirect(new URL(`/app/app-builder?${query}`, request.url));
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?product=app-builder", request.url));
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return studioRedirect(request, "google=denied");
  }

  const code = url.searchParams.get("code");
  const state = verifyAppBuilderGoogleState(url.searchParams.get("state"));
  const jar = await cookies();
  const nonce = jar.get(APP_BUILDER_GOOGLE_COOKIE)?.value;
  jar.delete(APP_BUILDER_GOOGLE_COOKIE);

  if (!code || !state || !nonce || state.nonce !== nonce) {
    return studioRedirect(request, "google=invalid");
  }
  if (state.orgId !== user.organizationId && !user.isSuperAdmin) {
    return studioRedirect(request, "google=invalid");
  }

  const redirectUri = appBuilderGoogleRedirectUri(request);
  const oauth2 = createAppBuilderOAuthClient(redirectUri);
  if (!oauth2) {
    return studioRedirect(request, "google=missing");
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      return studioRedirect(request, "google=norefresh");
    }

    oauth2.setCredentials(tokens);
    const oauth2Api = google.oauth2({
      version: "v2",
      auth: oauth2,
    });
    const me = await oauth2Api.userinfo.get();
    const googleEmail = me.data.email?.trim().toLowerCase();
    if (!googleEmail) {
      return studioRedirect(request, "google=invalid");
    }

    await prisma.appBuilderGoogleConnection.upsert({
      where: { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        googleEmail,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token ?? null,
        accessTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
      update: {
        googleEmail,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token ?? null,
        accessTokenExpiresAt: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });
  } catch (err) {
    console.error("[app-builder google callback]", err);
    return studioRedirect(request, "google=failed");
  }

  return studioRedirect(request, "google=connected");
}
