import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { submitTemplatePaymentProof } from "@/lib/templates/store";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return `template-proof:${ip}`;
}

/** Public: buyer submits UTR and/or payment screenshot after paying UPI. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const rate = await checkRateLimit(clientKey(request), 6, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${rate.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const { orderId } = await params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Order ID missing." }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const utr = form.get("utr")?.toString().slice(0, 100) ?? "";
  const file = form.get("file");

  let proofFile:
    | { name: string; mimeType: string; size: number; data: Buffer }
    | undefined;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Screenshot is too large. Maximum size is 8 MB." },
        { status: 400 },
      );
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Only PNG, JPG, WEBP, HEIC, or PDF files are allowed." },
        { status: 400 },
      );
    }
    proofFile = {
      name: file.name,
      mimeType: file.type,
      size: file.size,
      data: Buffer.from(await file.arrayBuffer()),
    };
  }

  const result = await submitTemplatePaymentProof({
    orderId: orderId.trim(),
    utr: utr || undefined,
    file: proofFile,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, message: result.message });
}

/** Team only: view the uploaded payment proof from CRM. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const order = await prisma.templateOrder.findUnique({
    where: { id: orderId },
    select: {
      paymentProofFileName: true,
      paymentProofMimeType: true,
      paymentProofData: true,
    },
  });

  if (!order?.paymentProofData || !order.paymentProofMimeType) {
    return NextResponse.json({ error: "No proof uploaded." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(order.paymentProofData), {
    headers: {
      "Content-Type": order.paymentProofMimeType,
      "Content-Disposition": `inline; filename="${(order.paymentProofFileName ?? "payment-proof").replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
