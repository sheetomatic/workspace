import { NextResponse } from "next/server";
import { listStates } from "@/lib/geo/masters";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const countryId = new URL(request.url).searchParams.get("countryId")?.trim();
  if (!countryId) {
    return NextResponse.json({ error: "countryId is required." }, { status: 400 });
  }
  const states = await listStates(countryId);
  return NextResponse.json({ states });
}
