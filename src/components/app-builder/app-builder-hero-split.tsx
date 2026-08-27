import type { ReactNode } from "react";
import type { AppPlan } from "@/lib/app-builder";
import { GlidePhonePreview } from "./glide-phone-preview";
import "./app-builder-landing.css";

export const TEMPLATE_LEAD: Record<string, string> = {
  custom: "One table you name. Title, status, notes — then add columns.",
  orders: "Parties, items, and line items. Staff add an order; lines stay on the parent.",
  crm: "Leads, follow-ups, and parties on the phone — not a row dump.",
  inventory: "Items, stock in, stock out. Reorder shows before you run out.",
  attendance: "Staff in/out and leave. Owner sees who is late, not a register book.",
  visitors: "Gate in/out with who and when. No paper at the door.",
  expenses: "Cash out and approve. Owner sees what left the till.",
  cashbook: "Credits, debits, and expenses by date and category. Add a new category from the phone.",
  tasks: "Assign, due, close. Person-wise work without a second sheet.",
};

export function templateFacts(plan: AppPlan) {
  return Object.keys(plan.workbook.tabs).slice(0, 3);
}

export function AppBuilderHeroSplit({
  id,
  kicker,
  title,
  titleAs = "h2",
  lead,
  facts,
  note,
  plan,
  large = true,
  featured = false,
  children,
  actions,
}: {
  id?: string;
  kicker?: string;
  title: ReactNode;
  titleAs?: "h1" | "h2";
  lead?: ReactNode;
  facts?: string[];
  note?: ReactNode;
  plan?: AppPlan;
  large?: boolean;
  featured?: boolean;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  const Title = titleAs;
  return (
    <section className={featured ? "ab-land-hero is-featured" : "ab-land-hero"} id={id}>
      <div className="ab-land-hero-inner mx-auto max-w-7xl px-5 sm:px-8">
        <div className="ab-land-hero-copy">
          {kicker ? <p className="ab-land-kicker">{kicker}</p> : null}
          <Title>{title}</Title>
          {lead ? <p className="ab-land-lead">{lead}</p> : null}
          {facts?.length ? (
            <ul className="ab-land-facts">
              {facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : null}
          {children}
          {actions ? <div className="ab-land-actions">{actions}</div> : null}
          {note ? <p className="ab-land-note">{note}</p> : null}
        </div>
        <div className="ab-land-hero-phone">
          <GlidePhonePreview plan={plan} large={large} />
        </div>
      </div>
    </section>
  );
}
