import { checkoutAccessHash, ownedCheckout } from "@/lib/templates/checkout";
import { templateInvoiceHtml } from "@/lib/templates/invoice";
import { checkCheckoutRequest, privateHeaders } from "@/lib/templates/http";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await checkCheckoutRequest(request);
    const { id } = await context.params;
    const order = await ownedCheckout(id, checkoutAccessHash(request));
    const html = templateInvoiceHtml(order);
    return new Response(html, {
      headers: {
        ...privateHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${order.invoiceNumber!.replaceAll("/", "-")}.html"`,
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "Invoice unavailable until payment is verified, or order access is invalid.",
      },
      { status: 404, headers: privateHeaders },
    );
  }
}
