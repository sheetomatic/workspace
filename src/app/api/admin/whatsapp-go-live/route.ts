import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";

/** Ops endpoint: enable AI Go Live for the primary Sheetomatic org. Requires CRON_SECRET. */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET required" }, { status: 503 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { slug: PRIMARY_ORG_SLUG },
    select: { id: true, name: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Primary org not found" }, { status: 404 });
  }

  const settings = await prisma.workspaceWhatsAppSettings.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      businessPhone: process.env.WHATSAPP_FALLBACK_PHONE?.trim() || "919329103106",
      redlavaPhoneId: process.env.REDLAVA_PHONE_ID?.trim() || "1102997926228862",
      botLiveAt: new Date(),
    },
    update: {
      botLiveAt: new Date(),
      businessPhone:
        process.env.WHATSAPP_FALLBACK_PHONE?.trim() || "919329103106",
      redlavaPhoneId: process.env.REDLAVA_PHONE_ID?.trim() || "1102997926228862",
    },
  });

  return NextResponse.json({
    ok: true,
    organization: org.name,
    isLive: Boolean(settings.botLiveAt),
    liveSince: settings.botLiveAt?.toISOString() ?? null,
  });
}
