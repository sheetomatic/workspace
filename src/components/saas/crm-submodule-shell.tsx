import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import "./crm-submodule-shell.css";

export type CrmKpi = {
  label: string;
  value: string;
  accent?: "blue" | "warning" | "success" | "danger";
  href?: string;
  active?: boolean;
};

export function CrmSubmoduleShell({
  title,
  description,
  kpis,
  children,
  leadsHref = "/app/leads",
}: {
  title: string;
  description: string;
  kpis: CrmKpi[];
  children: React.ReactNode;
  leadsHref?: string | null;
}) {
  return (
    <div className="saas-page leads-machine-page crm-submodule-page">
      <TaskPageToolbar
        title={title}
        description={description}
        actions={
          leadsHref ? (
            <Link href={leadsHref} className="btn-secondary btn-sm">
              All leads
            </Link>
          ) : null
        }
      />
      <section className="crm-submodule-kpis" aria-label={`${title} summary`}>
        {kpis.map((kpi) => {
          const className = `crm-submodule-kpi${kpi.accent ? ` accent-${kpi.accent}` : ""}${
            kpi.active ? " is-active" : ""
          }`;
          const body = (
            <>
              <span>{kpi.label}</span>
              <strong>{kpi.value}</strong>
            </>
          );
          if (kpi.href) {
            return (
              <Link
                key={kpi.label}
                href={kpi.href}
                className={className}
                aria-current={kpi.active ? "page" : undefined}
              >
                {body}
              </Link>
            );
          }
          return (
            <article key={kpi.label} className={className}>
              {body}
            </article>
          );
        })}
      </section>
      {children}
    </div>
  );
}
