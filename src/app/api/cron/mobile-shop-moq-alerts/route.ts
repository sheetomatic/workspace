import { NextResponse } from "next/server";
import { dispatchMobileShopMoqAlerts } from "@/lib/mobile-shop/moq-alerts";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production" && !cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET required" }, { status: 503 });
  }

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchMobileShopMoqAlerts();
  return NextResponse.json(result);
}
