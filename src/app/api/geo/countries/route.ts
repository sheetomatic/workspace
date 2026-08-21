import { NextResponse } from "next/server";
import { listCountries } from "@/lib/geo/masters";

export const runtime = "nodejs";

export async function GET() {
  const countries = await listCountries();
  return NextResponse.json({ countries });
}
