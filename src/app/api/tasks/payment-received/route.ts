import { NextResponse } from "next/server";
import { sendPlainEmail } from "@/lib/integrations/email";
import { checkCheckoutRequest, checkoutJson, privateHeaders } from "@/lib/templates/http";

export const runtime = "nodejs";

const PANEL_URL = "https://workspace.sheetomatic.com/app/tasks";
const VIDEO_URL = "https://youtu.be/n-bHn6kFuaA";

export async function POST(request: Request) {
  try {
    await checkCheckoutRequest(request);
    const body = (await checkoutJson(request)) as Record<string, unknown>;
    const paymentId = typeof body.paymentId === "string" ? body.paymentId : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : "there";
    if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
      return NextResponse.json({ error: "Payment reference is missing." }, { status: 400, headers: privateHeaders });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json(
        { panelUrl: PANEL_URL, videoUrl: VIDEO_URL, emailed: false },
        { headers: privateHeaders },
      );
    }
    const result = await sendPlainEmail({
      toEmail: email,
      subject: "Your Sheetomatic Tasks panel is ready",
      text: [
        `Hello ${name},`,
        "",
        "Razorpay reported your Tasks payment. Your module panel is ready:",
        PANEL_URL,
        "",
        "Watch the setup video, then sign in and open Tasks:",
        VIDEO_URL,
        "",
        `Payment reference: ${paymentId}`,
        "Keep this Razorpay receipt. Support: founder@sheetomatic.com",
      ].join("\n"),
    });
    return NextResponse.json(
      { panelUrl: PANEL_URL, videoUrl: VIDEO_URL, emailed: result.sent },
      { headers: privateHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "The Tasks panel invite could not be sent. Use the panel link on the pricing page." },
      { status: 400, headers: privateHeaders },
    );
  }
}
