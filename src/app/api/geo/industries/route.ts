import { NextResponse } from "next/server";
import { listIndustries } from "@/lib/geo/masters";

export const runtime = "nodejs";

export async function GET() {
  const industries = await listIndustries();
  return NextResponse.json({ industries });
}
