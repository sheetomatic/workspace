"use server";
import { revalidatePath } from "next/cache";
import { confirmHostedPayment } from "@/lib/templates/hosted-checkout";

export async function confirmCartPaymentAction(
  _previous: { message: string },
  form: FormData,
) {
  try {
    await confirmHostedPayment({
      id: String(form.get("id") ?? ""),
      reference: String(form.get("reference") ?? ""),
      amountInr: String(form.get("amountInr") ?? ""),
      verified: form.get("verified") === "on",
    });
    revalidatePath("/app/template-orders");
    return {
      message:
        "Payment confirmed. The tax invoice and copy links have been emailed.",
    };
  } catch (error) {
    return {
      message:
        error instanceof Error && !error.message.includes("prisma")
          ? error.message
          : "Confirmation failed. Check whether this payment reference was already used.",
    };
  }
}
