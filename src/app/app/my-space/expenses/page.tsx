import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { MySpaceExpenseForm } from "@/components/my-space/my-space-expense-form";
import { MySpaceExpenseList } from "@/components/my-space/my-space-expense-list";
import { requireSession } from "@/lib/require-session";
import { listOrgExpenses } from "@/lib/my-space/expenses";

export default async function MySpaceExpensesPage() {
  const user = await requireSession("MANAGER");
  const expenses = await listOrgExpenses(user.organizationId);

  const rows = expenses.map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    amount: Number(row.amount),
    expenseDate: row.expenseDate,
    recurrence: row.recurrence,
    quantity: row.quantity,
    vendor: row.vendor,
    notes: row.notes,
  }));

  return (
    <div className="saas-page ws-ims-sf">
      <div className="ws-ims-page">
        <TaskPageToolbar
          title="Expenses"
          description="API (Cursor, OpenAI, WhatsApp), marketing, salary, rent, mobile, electricity, subscriptions, phone plans, fuel, and vehicles."
          actions={
            <Link href="/app/my-space" className="ws-btn ws-btn-ghost">
              Back to My Space
            </Link>
          }
        />

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>Add expense</h2>
          </div>
          <MySpaceExpenseForm />
        </section>

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>All expenses</h2>
          </div>
          <MySpaceExpenseList expenses={rows} />
        </section>
      </div>
    </div>
  );
}
