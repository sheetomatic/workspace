"use server";

import type { OrgExpenseCategory, OrgExpenseRecurrence } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { createOrgExpense, deleteOrgExpense } from "@/lib/my-space/expenses";
import { ORG_EXPENSE_CATEGORIES } from "@/lib/my-space/expense-labels";

export type MySpaceActionState = {
  ok: boolean;
  message: string;
};

function revalidateMySpace() {
  revalidatePath("/app/my-space");
  revalidatePath("/app/my-space/expenses");
}

function parseCategory(value: FormDataEntryValue | null): OrgExpenseCategory {
  const raw = value?.toString() ?? "";
  if (ORG_EXPENSE_CATEGORIES.includes(raw as OrgExpenseCategory)) {
    return raw as OrgExpenseCategory;
  }
  throw new Error("Select a valid expense category.");
}

export async function createOrgExpenseAction(
  _prev: MySpaceActionState,
  formData: FormData,
): Promise<MySpaceActionState> {
  try {
    const user = await requireSession("MANAGER");
    const recurrenceRaw = formData.get("recurrence")?.toString() ?? "ONE_TIME";
    const recurrence: OrgExpenseRecurrence =
      recurrenceRaw === "MONTHLY" ? "MONTHLY" : "ONE_TIME";
    const quantityRaw = formData.get("quantity")?.toString();
    const quantity =
      quantityRaw && quantityRaw.trim() !== ""
        ? Number.parseInt(quantityRaw, 10)
        : null;

    await createOrgExpense({
      organizationId: user.organizationId,
      createdById: user.id,
      category: parseCategory(formData.get("category")),
      title: formData.get("title")?.toString() ?? "",
      amount: Number(formData.get("amount")?.toString() ?? ""),
      expenseDate: new Date(formData.get("expenseDate")?.toString() || Date.now()),
      recurrence,
      quantity: Number.isFinite(quantity) ? quantity : null,
      vendor: formData.get("vendor")?.toString(),
      notes: formData.get("notes")?.toString(),
    });

    revalidateMySpace();
    return { ok: true, message: "Expense saved." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save expense.",
    };
  }
}

export async function deleteOrgExpenseAction(expenseId: string): Promise<MySpaceActionState> {
  try {
    const user = await requireSession("MANAGER");
    await deleteOrgExpense(user.organizationId, expenseId);
    revalidateMySpace();
    return { ok: true, message: "Expense deleted." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not delete expense.",
    };
  }
}
