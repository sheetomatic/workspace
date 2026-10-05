import { NextResponse } from "next/server";
import {
  readRazorpayHandleConfig,
  SHEETOMATIC_RAZORPAY_ME_URL,
} from "@/lib/payments/razorpay-me";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_CACHE_MS = 60_000;

let cachedPage: { html: string; fetchedAt: number } | null = null;

async function razorpayPageHtml(): Promise<string> {
  const now = Date.now();
  if (cachedPage && now - cachedPage.fetchedAt < PAGE_CACHE_MS) {
    return cachedPage.html;
  }
  const response = await fetch(SHEETOMATIC_RAZORPAY_ME_URL, {
    cache: "no-store",
    headers: { "User-Agent": "Sheetomatic" },
  });
  if (!response.ok) {
    throw new Error(`Razorpay page returned ${response.status}`);
  }
  const html = await response.text();
  cachedPage = { html, fetchedAt: now };
  return html;
}

/** Public checkout details for the Sheetomatic Razorpay handle. Amount is set by the caller. */
export async function GET() {
  try {
    const config = readRazorpayHandleConfig(await razorpayPageHtml());
    return NextResponse.json(config, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Razorpay could not be opened. Try again." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
