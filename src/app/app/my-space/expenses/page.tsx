import Link from "next/link";
import type { OrgExpenseRecurrence } from "@prisma/client";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { MySpaceExpenseForm } from "@/components/my-space/my-space-expense-form";
import {
  MySpaceExpenseList,
  type ExpenseListFilter,
} from "@/components/my-space/my-space-expense-list";
import { requireSession } from "@/lib/require-session";
import { listOrgExpenses } from "@/lib/my-space/expenses";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseFilter(value: string | undefined): ExpenseListFilter {
  if (value === "fixed") return "fixed";
  if (value === "one_time") return "one_time";
  return "all";
}

function recurrenceForFilter(filter: ExpenseListFilter): OrgExpenseRecurrence | undefined {
  if (filter === "fixed") return "MONTHLY";
  if (filter === "one_time") return "ONE_TIME";
  return undefined;
}

export default async function MySpaceExpensesPage({ searchParams }: PageProps) {
  const user = await requireSession("MANAGER");
  const params = await searchParams;
  const filter = parseFilter(typeof params.type === "string" ? params.type : undefined);
  const expenses = await listOrgExpenses(user.organizationId, {
    recurrence: recurrenceForFilter(filter),
  });

  const rows = expenses.map((row) => ({
    id: row.id,
    category: row.category,
    title: row.title,
    amount: Number(row.amount),
    expenseDate: row.expenseDate,
    recurrence: row.recurrence,
    quantity: row.quantity,
    assetLabel: row.assetLabel,
    vendor: row.vendor,
    notes: row.notes,
  }));

  return (
    <div className="saas-page ws-ims-sf">
      <div className="ws-ims-page">
        <TaskPageToolbar
          title="Expenses"
          description="Fixed and one-time spends — EMI with asset, Active Numbers plan, Internet / WiFi, and household costs."
          actions={
            <Link href="/app/my-space" className="ws-btn ws-btn-ghost">
              Back to My Space
            </Link>
          }
        />

        <section className="leads-period-toolbar" aria-label="Expense type filter">
          <div className="leads-period-types">
            <Link
              className={filter === "all" ? "leads-machine-filter active" : "leads-machine-filter"}
              href="/app/my-space/expenses"
            >
              All
            </Link>
            <Link
              className={
                filter === "fixed" ? "leads-machine-filter active" : "leads-machine-filter"
              }
              href="/app/my-space/expenses?type=fixed"
            >
              Fixed expenses
            </Link>
            <Link
              className={
                filter === "one_time" ? "leads-machine-filter active" : "leads-machine-filter"
              }
              href="/app/my-space/expenses?type=one_time"
            >
              One-time
            </Link>
          </div>
        </section>

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>Add expense</h2>
          </div>
          <MySpaceExpenseForm />
        </section>

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>
              {filter === "fixed"
                ? "Fixed expenses"
                : filter === "one_time"
                  ? "One-time expenses"
                  : "All expenses"}
            </h2>
          </div>
          <MySpaceExpenseList expenses={rows} filter={filter} />
        </section>
      </div>
    </div>
  );
}
