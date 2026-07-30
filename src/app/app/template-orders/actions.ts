"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  markTemplatePaymentReceived,
  upsertTemplateProduct,
} from "@/lib/templates/store";
import type { TemplateProductType } from "@prisma/client";

export type TemplateOrderActionState = {
  ok: boolean;
  message: string;
};

export async function markTemplatePaymentReceivedAction(
  _prev: TemplateOrderActionState,
  formData: FormData,
): Promise<TemplateOrderActionState> {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) {
    return { ok: false, message: "Only super admins can confirm template payments." };
  }

  const orderId = formData.get("orderId")?.toString().trim();
  if (!orderId) {
    return { ok: false, message: "Order not found." };
  }

  const result = await markTemplatePaymentReceived({
    orderId,
    actorUserId: user.id,
  });

  revalidatePath("/app/approvals");
  revalidatePath("/app/template-orders");
  return { ok: result.ok, message: result.message };
}

export async function saveTemplateProductAction(
  _prev: TemplateOrderActionState,
  formData: FormData,
): Promise<TemplateOrderActionState> {
  const user = await getSessionUser();
  if (!user?.isSuperAdmin) {
    return { ok: false, message: "Only super admins can edit template products." };
  }

  const id = formData.get("id")?.toString().trim() || undefined;
  const slug = formData.get("slug")?.toString().trim();
  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type")?.toString().trim() as TemplateProductType;
  const priceInr = Number.parseInt(formData.get("priceInr")?.toString() || "", 10);
  const description = formData.get("description")?.toString().trim();
  const copyLink = formData.get("copyLink")?.toString().trim();
  const sortOrder = Number.parseInt(formData.get("sortOrder")?.toString() || "0", 10);
  const active = formData.get("active")?.toString() === "on";

  if (!slug || !name || !["APPSHEET", "SHEETS", "EXCEL"].includes(type)) {
    return { ok: false, message: "Slug, name, and type are required." };
  }
  if (!Number.isFinite(priceInr) || priceInr < 0) {
    return { ok: false, message: "Enter a valid price in INR." };
  }

  await upsertTemplateProduct({
    id,
    slug,
    name,
    type,
    priceInr,
    description,
    copyLink,
    active,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  });

  revalidatePath("/app/template-orders");
  revalidatePath("/templates");
  return { ok: true, message: "Product saved." };
}
