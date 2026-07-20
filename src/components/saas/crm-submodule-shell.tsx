import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";

export type CrmKpi = {
  label: string;
  value: string;
  accent?: "blue" | "warning" | "success" | "danger";
};

export function CrmSubmoduleShell({
  title,
  description,
  kpis,
  children,
}: {
  title: string;
  description: string;
  kpis: CrmKpi[];
  children: React.ReactNode;
}) {
  return (
    <div className="saas-page leads-machine-page crm-submodule-page">
      <TaskPageToolbar
        title={title}
        description={description}
        actions={
          <Link href="/app/leads" className="btn-secondary btn-sm">
            All leads
          </Link>
        }
      />
      <section className="crm-submodule-kpis" aria-label={`${title} summary`}>
        {kpis.map((kpi) => (
          <article
            key={kpi.label}
            className={`crm-submodule-kpi${kpi.accent ? ` accent-${kpi.accent}` : ""}`}
          >
            <span>{kpi.label}</span>
            <strong>{kpi.value}</strong>
          </article>
        ))}
      </section>
      {children}
    </div>
  );
}
