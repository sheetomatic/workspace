import { NextResponse } from "next/server";
import { listCities } from "@/lib/geo/masters";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const stateId = new URL(request.url).searchParams.get("stateId")?.trim();
  if (!stateId) {
    return NextResponse.json({ error: "stateId is required." }, { status: 400 });
  }
  const cities = await listCities(stateId);
  return NextResponse.json({ cities });
}
