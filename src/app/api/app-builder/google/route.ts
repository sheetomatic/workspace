import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { TEMPLATES, type SheetWorkbook } from "@/lib/app-builder";
import { workbookFromClient } from "@/lib/app-builder/workbook-payload";
import {
  appBuilderGoogleRedirectUri,
  appBuilderOAuthFromTokens,
  createAppBuilderSpreadsheet,
  isAppBuilderGoogleConfigured,
  listAppBuilderSpreadsheets,
} from "@/lib/app-builder/google";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const configured = isAppBuilderGoogleConfigured();
  const connection = await prisma.appBuilderGoogleConnection.findUnique({
    where: { organizationId: user.organizationId },
    select: {
      googleEmail: true,
      spreadsheetId: true,
      spreadsheetTitle: true,
      refreshToken: true,
      accessToken: true,
      accessTokenExpiresAt: true,
    },
  });

  if (!configured || !connection) {
    return NextResponse.json({
      configured,
      connected: false,
    });
  }

  const oauth2 = appBuilderOAuthFromTokens(
    appBuilderGoogleRedirectUri(request),
    connection,
  );
  let files: { id: string; name: string }[] = [];
  if (oauth2) {
    try {
      files = await listAppBuilderSpreadsheets(oauth2);
    } catch (error) {
      console.error("[app-builder google list]", error);
    }
  }

  return NextResponse.json({
    configured,
    connected: true,
    googleEmail: connection.googleEmail,
    spreadsheetId: connection.spreadsheetId,
    spreadsheetTitle: connection.spreadsheetTitle,
    files,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    action?: string;
    spreadsheetId?: string;
    templateId?: string;
    title?: string;
    workbook?: unknown;
  } | null;
  const action = body?.action;

  if (action === "disconnect") {
    await prisma.appBuilderGoogleConnection.deleteMany({
      where: { organizationId: user.organizationId },
    });
    return NextResponse.json({ ok: true, connected: false });
  }

  if (action === "create") {
    const template = TEMPLATES.find((item) => item.id === body?.templateId);
    const customBook = workbookFromClient(body?.workbook);
    const workbook: SheetWorkbook | undefined = template?.workbook ?? customBook;
    const title =
      (typeof body?.title === "string" && body.title.trim().slice(0, 80)) ||
      (template ? `${template.config.meta.name} · Sheetomatic` : workbook?.title);
    if (!workbook || !title) {
      return NextResponse.json(
        { error: "Choose a template, or describe an app to create a new Sheet." },
        { status: 400 },
      );
    }
    const connection = await prisma.appBuilderGoogleConnection.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!connection) {
      return NextResponse.json({ error: "Connect Google first." }, { status: 400 });
    }
    const oauth2 = appBuilderOAuthFromTokens(
      appBuilderGoogleRedirectUri(request),
      connection,
    );
    if (!oauth2) {
      return NextResponse.json(
        { error: "Google connect is not configured." },
        { status: 503 },
      );
    }
    try {
      const created = await createAppBuilderSpreadsheet(oauth2, title, workbook);
      await prisma.appBuilderGoogleConnection.update({
        where: { organizationId: user.organizationId },
        data: {
          spreadsheetId: created.spreadsheetId,
          spreadsheetTitle: created.spreadsheetTitle,
        },
      });
      return NextResponse.json({ ok: true, ...created, templateId: template?.id ?? null });
    } catch (error) {
      console.error("[app-builder google create]", error);
      return NextResponse.json(
        {
          error:
            "Could not create a Sheet. Disconnect Google, connect again, and allow Sheets access.",
        },
        { status: 400 },
      );
    }
  }

  if (action === "select") {
    const spreadsheetId = body?.spreadsheetId?.trim();
    if (!spreadsheetId) {
      return NextResponse.json({ error: "Choose a Google Sheet." }, { status: 400 });
    }

    const connection = await prisma.appBuilderGoogleConnection.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!connection) {
      return NextResponse.json({ error: "Connect Google first." }, { status: 400 });
    }

    const oauth2 = appBuilderOAuthFromTokens(
      appBuilderGoogleRedirectUri(request),
      connection,
    );
    if (!oauth2) {
      return NextResponse.json(
        { error: "Google connect is not configured." },
        { status: 503 },
      );
    }

    try {
      const { google } = await import("googleapis");
      const sheets = google.sheets({ version: "v4", auth: oauth2 });
      const meta = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: "properties.title",
      });
      const spreadsheetTitle = meta.data.properties?.title?.trim() || "Google Sheet";
      await prisma.appBuilderGoogleConnection.update({
        where: { organizationId: user.organizationId },
        data: { spreadsheetId, spreadsheetTitle },
      });
      return NextResponse.json({
        ok: true,
        spreadsheetId,
        spreadsheetTitle,
      });
    } catch (error) {
      console.error("[app-builder google select]", error);
      return NextResponse.json(
        { error: "Could not open that Sheet. Pick another, or reconnect Google." },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
